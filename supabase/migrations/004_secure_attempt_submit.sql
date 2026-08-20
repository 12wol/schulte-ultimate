-- 禁止客户端直接写 test_attempts：只能走 submit_attempt RPC
-- 在 Supabase SQL Editor 执行本文件（001～003 之后）

create or replace function public.min_attempt_duration_ms(p_grid_size int)
returns int
language sql
immutable
parallel safe
as $$
  -- 5×5 ≥ 3000ms（每格 120ms），挡住 1ms 假分
  select p_grid_size * p_grid_size * 120;
$$;

-- 先清掉已经入库的离谱假分，否则后面的 CHECK 会失败
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

alter table public.test_attempts
  drop constraint if exists test_attempts_grid_size_check;

alter table public.test_attempts
  add constraint test_attempts_grid_size_check
  check (grid_size between 3 and 7);

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

  if (
    select count(*)::int
    from public.test_attempts
    where user_id = v_uid
      and created_at > now() - interval '10 minutes'
  ) >= 40 then
    raise exception '提交太频繁，请稍后再试';
  end if;

  v_wrong := 0;
  if p_meta is not null
     and jsonb_typeof(p_meta) = 'object'
     and coalesce(p_meta ->> 'wrongClicks', '') ~ '^[0-9]+$' then
    v_wrong := least((p_meta ->> 'wrongClicks')::int, 10000);
  end if;
  v_meta := jsonb_build_object('wrongClicks', v_wrong);

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

drop policy if exists "attempts_insert_own" on public.test_attempts;
drop policy if exists "attempts_delete_own" on public.test_attempts;

revoke insert, update, delete on public.test_attempts from anon, authenticated, public;

revoke all on function public.submit_attempt(text, int, int, jsonb) from public;
grant execute on function public.submit_attempt(text, int, int, jsonb) to authenticated;

notify pgrst, 'reload schema';
