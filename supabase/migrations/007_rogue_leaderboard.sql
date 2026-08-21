-- 方格远征：专用入库（无点击序列）+ 肉鸽排行榜 RPC
-- 在 006_schulte_rogue_variant.sql 之后执行
-- 经典榜仍走 fetch_leaderboard；肉鸽走 fetch_rogue_leaderboard，禁止用最短用时混榜

-- 入库约束：肉鸽允许较短总用时（早死），经典仍按格子数下限
alter table public.test_attempts
  drop constraint if exists test_attempts_duration_ms_check;

alter table public.test_attempts
  add constraint test_attempts_duration_ms_check
  check (
    duration_ms <= 3600000
    and (
      (
        variant_id = 'schulte-rogue'
        and duration_ms >= 1000
      )
      or (
        variant_id is distinct from 'schulte-rogue'
        and duration_ms >= public.min_attempt_duration_ms(grid_size)
      )
    )
  );

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
  v_layers int;
  v_focus int;
  v_grid int;
  v_relics jsonb;
begin
  if v_uid is null then
    raise exception '请先登录';
  end if;

  if not exists (
    select 1 from public.test_variants
    where id = p_variant_id and enabled = true
  ) then
    raise exception '该测试未开放';
  end if;

  if (
    select count(*)::int
    from public.test_attempts
    where user_id = v_uid
      and created_at > now() - interval '10 minutes'
  ) >= 40 then
    raise exception '提交太频繁，请稍后再试';
  end if;

  -- ---------- 方格远征：按 Run 结算，不校验点击序列 ----------
  if p_variant_id = 'schulte-rogue' then
    -- 统一桶：所有远征成绩用 grid_size=5 聚合，避免按末层网格拆榜
    v_grid := 5;

    if p_duration_ms is null or p_duration_ms < 1000 then
      raise exception '用时过短，未能入库';
    end if;
    if p_duration_ms > 3600000 then
      raise exception '用时超出范围';
    end if;

    if p_meta is null or jsonb_typeof(p_meta) is distinct from 'object' then
      raise exception '远征结算缺少 meta';
    end if;
    if coalesce(p_meta ->> 'mode', '') is distinct from 'rogue' then
      raise exception '远征结算无效';
    end if;

    if coalesce(p_meta ->> 'layersCleared', '') !~ '^[0-9]+$' then
      raise exception '远征层数无效';
    end if;
    v_layers := least((p_meta ->> 'layersCleared')::int, 8);
    if v_layers < 0 then
      raise exception '远征层数无效';
    end if;

    v_focus := 0;
    if coalesce(p_meta ->> 'focusLeft', '') ~ '^[0-9]+$' then
      v_focus := least((p_meta ->> 'focusLeft')::int, 99);
    end if;

    v_wrong := 0;
    if coalesce(p_meta ->> 'totalWrong', '') ~ '^[0-9]+$' then
      v_wrong := least((p_meta ->> 'totalWrong')::int, 10000);
    elsif coalesce(p_meta ->> 'wrongClicks', '') ~ '^[0-9]+$' then
      v_wrong := least((p_meta ->> 'wrongClicks')::int, 10000);
    end if;

    v_relics := '[]'::jsonb;
    if jsonb_typeof(p_meta -> 'relics') = 'array' then
      v_relics := p_meta -> 'relics';
    end if;

    v_meta := jsonb_build_object(
      'mode', 'rogue',
      'won', coalesce((p_meta ->> 'won')::boolean, false),
      'layersCleared', v_layers,
      'focusLeft', v_focus,
      'totalWrong', v_wrong,
      'relics', v_relics,
      'seed', left(coalesce(p_meta ->> 'seed', ''), 64)
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
      v_grid,
      p_duration_ms,
      (timezone('Asia/Shanghai', now()))::date,
      v_meta
    )
    returning * into v_row;

    return v_row;
  end if;

  -- ---------- 经典等：必须带点击序列 ----------
  if p_grid_size is null or p_grid_size < 3 or p_grid_size > 7 then
    raise exception '网格大小不支持';
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

-- 肉鸽榜：最远层优先，同层比用时；通关榜只看通关最快
create or replace function public.fetch_rogue_leaderboard(
  p_mode text,
  p_metric text
)
returns table (
  user_id uuid,
  display_name text,
  best_layers int,
  best_ms int,
  clear_count int,
  attempt_count int,
  won_best_ms int,
  avg_layers int,
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
  if p_mode is distinct from 'today' and p_mode is distinct from 'all' then
    raise exception '排行范围无效';
  end if;
  if p_metric not in ('depth', 'clear', 'avg') then
    raise exception '排行方式无效';
  end if;

  return query
  with runs as (
    select
      a.user_id,
      a.duration_ms,
      a.played_on,
      a.created_at,
      least(greatest(coalesce((a.meta ->> 'layersCleared')::int, 0), 0), 8) as layers,
      coalesce((a.meta ->> 'won')::boolean, false) as won
    from public.test_attempts a
    where a.variant_id = 'schulte-rogue'
      and (
        p_mode = 'all'
        or a.played_on = (timezone('Asia/Shanghai', now()))::date
      )
  ),
  stats as (
    select
      r.user_id,
      max(r.layers)::int as best_layers,
      (
        array_agg(r.duration_ms order by r.layers desc, r.duration_ms asc, r.created_at asc)
      )[1]::int as best_ms,
      count(*) filter (where r.won)::int as clear_count,
      count(*)::int as attempt_count,
      min(r.duration_ms) filter (where r.won)::int as won_best_ms,
      round(avg(r.layers))::int as avg_layers,
      (
        array_agg(r.played_on order by r.layers desc, r.duration_ms asc, r.created_at asc)
      )[1] as played_on
    from runs r
    group by r.user_id
  )
  select
    s.user_id,
    coalesce(nullif(trim(p.display_name), ''), '岛民'),
    s.best_layers,
    s.best_ms,
    s.clear_count,
    s.attempt_count,
    coalesce(s.won_best_ms, 0),
    s.avg_layers,
    s.played_on
  from stats s
  left join public.profiles p on p.id = s.user_id
  where p_metric is distinct from 'clear' or s.clear_count > 0
  order by
    case
      when p_metric = 'clear' then coalesce(s.won_best_ms, 2147483647)
      else 0
    end asc,
    case
      when p_metric = 'depth' then -s.best_layers
      when p_metric = 'avg' then -s.avg_layers
      else -s.best_layers
    end,
    case
      when p_metric = 'clear' then -s.best_layers
      else s.best_ms
    end asc,
    s.attempt_count desc
  limit 20;
end;
$$;

revoke all on function public.submit_attempt(text, int, int, jsonb) from public;
grant execute on function public.submit_attempt(text, int, int, jsonb) to authenticated;

revoke all on function public.fetch_rogue_leaderboard(text, text) from public;
grant execute on function public.fetch_rogue_leaderboard(text, text) to authenticated;
