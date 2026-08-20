-- 排行榜聚合、点击序列校验、日志配额、轮换开发者口令
-- 在 004_secure_attempt_submit.sql 之后执行

create or replace function public.min_attempt_duration_ms(p_grid_size int)
returns int
language sql
immutable
parallel safe
as $$
  select p_grid_size * p_grid_size * 120;
$$;

delete from public.test_attempts
where duration_ms < public.min_attempt_duration_ms(grid_size)
   or duration_ms > 3600000
   or grid_size not between 3 and 7;

alter table public.test_attempts
  drop constraint if exists test_attempts_duration_ms_check;

alter table public.test_attempts
  add constraint test_attempts_duration_ms_check
  check (
    duration_ms >= public.min_attempt_duration_ms(grid_size)
    and duration_ms <= 3600000
  );

create or replace function public.assert_click_trace(
  p_grid_size int,
  p_duration_ms int,
  p_clicks jsonb
)
returns void
language plpgsql
immutable
as $$
declare
  v_cells int := p_grid_size * p_grid_size;
  v_i int;
  v_item jsonb;
  v_n int;
  v_t int;
  v_prev int := -2147483647;
begin
  if jsonb_typeof(p_clicks) is distinct from 'array' then
    raise exception '缺少点击序列';
  end if;
  if jsonb_array_length(p_clicks) is distinct from v_cells then
    raise exception '点击序列不完整';
  end if;

  for v_i in 0 .. v_cells - 1 loop
    v_item := p_clicks -> v_i;
    if jsonb_typeof(v_item) is distinct from 'object' then
      raise exception '点击序列无效';
    end if;
    if coalesce(v_item ->> 'n', '') !~ '^[0-9]+$'
       or coalesce(v_item ->> 't', '') !~ '^[0-9]+$' then
      raise exception '点击序列无效';
    end if;

    v_n := (v_item ->> 'n')::int;
    v_t := (v_item ->> 't')::int;
    if v_n is distinct from (v_i + 1) then
      raise exception '点击序列无效';
    end if;
    if v_t < 0 or v_t > 3600000 then
      raise exception '点击序列无效';
    end if;
    if v_i = 0 then
      if v_t < 0 then
        raise exception '点击序列无效';
      end if;
    elsif v_t < v_prev + 40 then
      raise exception '用时过短，未能入库';
    end if;
    v_prev := v_t;
  end loop;

  if abs(v_prev - p_duration_ms) > 80 then
    raise exception '用时与点击序列不一致';
  end if;
end;
$$;

create or replace function public.submit_attempt(
  p_variant_id text,
  p_grid_size int,
  p_duration_ms int,
  p_meta jsonb default '{}'::jsonb
)
returns public.test_attempts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.test_attempts;
  v_min int;
  v_wrong int;
  v_meta jsonb;
  v_clicks jsonb;
begin
  if v_uid is null then
    raise exception '请先登录';
  end if;

  if p_grid_size is null or p_grid_size < 3 or p_grid_size > 7 then
    raise exception '网格大小不支持';
  end if;

  if not exists (
    select 1 from public.test_variants
    where id = p_variant_id and enabled = true
  ) then
    raise exception '该测试未开放';
  end if;

  v_min := public.min_attempt_duration_ms(p_grid_size);
  if p_duration_ms is null or p_duration_ms < v_min then
    raise exception '用时过短，未能入库';
  end if;
  if p_duration_ms > 3600000 then
    raise exception '用时超出范围';
  end if;

  if p_meta is null or jsonb_typeof(p_meta) is distinct from 'object' then
    raise exception '缺少点击序列';
  end if;

  v_clicks := p_meta -> 'clicks';
  perform public.assert_click_trace(p_grid_size, p_duration_ms, v_clicks);

  if (
    select count(*)::int
    from public.test_attempts
    where user_id = v_uid
      and created_at > now() - interval '10 minutes'
  ) >= 40 then
    raise exception '提交太频繁，请稍后再试';
  end if;

  v_wrong := 0;
  if coalesce(p_meta ->> 'wrongClicks', '') ~ '^[0-9]+$' then
    v_wrong := least((p_meta ->> 'wrongClicks')::int, 10000);
  end if;

  v_meta := jsonb_build_object(
    'wrongClicks', v_wrong,
    'clicks', v_clicks
  );

  insert into public.test_attempts (
    user_id,
    variant_id,
    grid_size,
    duration_ms,
    played_on,
    meta
  ) values (
    v_uid,
    p_variant_id,
    p_grid_size,
    p_duration_ms,
    (timezone('Asia/Shanghai', now()))::date,
    v_meta
  )
  returning * into v_row;

  return v_row;
end;
$$;

drop policy if exists "attempts_select_leaderboard" on public.test_attempts;
drop policy if exists "attempts_insert_own" on public.test_attempts;
drop policy if exists "attempts_delete_own" on public.test_attempts;

revoke insert, update, delete on public.test_attempts from anon, authenticated, public;

create or replace function public.fetch_leaderboard(
  p_variant_id text,
  p_grid_size int,
  p_mode text,
  p_metric text
)
returns table (
  user_id uuid,
  display_name text,
  best_ms int,
  avg_ms int,
  worst_ms int,
  attempt_count int,
  played_on date
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception '请先登录';
  end if;
  if p_grid_size is null or p_grid_size < 3 or p_grid_size > 7 then
    raise exception '网格大小不支持';
  end if;
  if p_mode is distinct from 'today' and p_mode is distinct from 'all' then
    raise exception '排行范围无效';
  end if;
  if p_metric not in ('best', 'avg', 'worst') then
    raise exception '排行方式无效';
  end if;

  return query
  with stats as (
    select
      a.user_id,
      min(a.duration_ms)::int as best_ms,
      max(a.duration_ms)::int as worst_ms,
      round(avg(a.duration_ms))::int as avg_ms,
      count(*)::int as attempt_count,
      (array_agg(a.played_on order by a.duration_ms asc, a.created_at asc))[1] as played_on
    from public.test_attempts a
    where a.variant_id = p_variant_id
      and a.grid_size = p_grid_size
      and (
        p_mode = 'all'
        or a.played_on = (timezone('Asia/Shanghai', now()))::date
      )
    group by a.user_id
  )
  select
    s.user_id,
    coalesce(nullif(trim(p.display_name), ''), '岛民'),
    s.best_ms,
    s.avg_ms,
    s.worst_ms,
    s.attempt_count,
    s.played_on
  from stats s
  left join public.profiles p on p.id = s.user_id
  order by
    case
      when p_metric = 'worst' then s.worst_ms
      else 0
    end desc,
    case
      when p_metric = 'avg' then s.avg_ms
      when p_metric = 'best' then s.best_ms
      else 0
    end asc,
    case
      when p_metric = 'worst' then -s.avg_ms
      else s.avg_ms
    end,
    s.best_ms
  limit 20;
end;
$$;

create or replace function public.write_app_log(
  p_level text,
  p_event text,
  p_message text default null,
  p_meta jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_meta jsonb := coalesce(p_meta, '{}'::jsonb);
begin
  if p_level not in ('info', 'warn', 'error', 'debug') then
    raise exception '日志级别无效';
  end if;
  if p_event is null or p_event !~ '^[a-zA-Z0-9._-]{1,80}$' then
    raise exception '日志事件无效';
  end if;
  if p_message is not null and char_length(p_message) > 500 then
    p_message := left(p_message, 500);
  end if;
  if jsonb_typeof(v_meta) is distinct from 'object' then
    v_meta := '{}'::jsonb;
  end if;
  if char_length(v_meta::text) > 4000 then
    v_meta := '{}'::jsonb;
  end if;

  if v_uid is not null then
    if (
      select count(*)::int
      from public.app_logs
      where user_id = v_uid
        and created_at > now() - interval '10 minutes'
    ) >= 40 then
      raise exception '日志过多';
    end if;
  else
    if (
      select count(*)::int
      from public.app_logs
      where user_id is null
        and created_at > now() - interval '10 minutes'
    ) >= 20 then
      raise exception '日志过多';
    end if;
  end if;

  insert into public.app_logs (user_id, level, event, message, meta)
  values (v_uid, p_level, p_event, p_message, v_meta);
end;
$$;

drop policy if exists "logs_insert_authenticated" on public.app_logs;
drop policy if exists "logs_insert_anon" on public.app_logs;

revoke insert, update, delete on public.app_logs from anon, authenticated, public;
grant select on public.app_logs to authenticated;

select set_config('app.allow_dev_flag', 'on', true);
update public.profiles set is_developer = false where is_developer = true;

update public.app_config
set value = 'island-NrHMZZqwNKdAQsXaD2'
where key = 'developer_passcode'
  and value = 'island-dev-2026';

revoke all on function public.assert_click_trace(int, int, jsonb) from public;
revoke all on function public.submit_attempt(text, int, int, jsonb) from public;
revoke all on function public.fetch_leaderboard(text, int, text, text) from public;
revoke all on function public.write_app_log(text, text, text, jsonb) from public;

grant execute on function public.submit_attempt(text, int, int, jsonb) to authenticated;
grant execute on function public.fetch_leaderboard(text, int, text, text) to authenticated;
grant execute on function public.write_app_log(text, text, text, jsonb) to anon, authenticated;

notify pgrst, 'reload schema';
