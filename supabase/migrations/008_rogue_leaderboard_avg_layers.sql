-- 远征榜补齐 avg_layers 返回列（007 已执行过的环境需再跑本文件）
-- CREATE OR REPLACE 无法改 returns table 列，须先 drop

drop function if exists public.fetch_rogue_leaderboard(text, text);

create function public.fetch_rogue_leaderboard(
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

revoke all on function public.fetch_rogue_leaderboard(text, text) from public;
grant execute on function public.fetch_rogue_leaderboard(text, text) to authenticated;
