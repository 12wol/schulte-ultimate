-- Schulte Ultimate — initial schema
-- Run this in Supabase SQL Editor (or via supabase db push)

create extension if not exists "pgcrypto";

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  username text not null,
  preferred_grid_size int not null default 5
    check (preferred_grid_size between 3 and 7),
  is_developer boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_username_unique on public.profiles (lower(username));

-- ---------- extensible test variants ----------
create table public.test_variants (
  id text primary key,
  name text not null,
  description text,
  enabled boolean not null default true,
  sort_order int not null default 0
);

insert into public.test_variants (id, name, description, sort_order) values
  ('schulte', '舒尔特方格', '按顺序点击数字，训练注意力与视觉搜索速度', 1);

-- ---------- every attempt ----------
create table public.test_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  variant_id text not null references public.test_variants (id),
  grid_size int not null check (grid_size between 3 and 10),
  duration_ms int not null check (duration_ms > 0),
  played_on date not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index test_attempts_user_day_idx
  on public.test_attempts (user_id, variant_id, played_on desc);

create index test_attempts_leaderboard_idx
  on public.test_attempts (variant_id, grid_size, duration_ms);

-- ---------- daily aggregates (view) ----------
create or replace view public.daily_stats
with (security_invoker = true)
as
select
  user_id,
  variant_id,
  grid_size,
  played_on,
  count(*)::int as attempt_count,
  min(duration_ms)::int as best_ms,
  max(duration_ms)::int as worst_ms,
  round(avg(duration_ms))::int as avg_ms
from public.test_attempts
group by user_id, variant_id, grid_size, played_on;

-- ---------- developer logs ----------
create table public.app_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  level text not null check (level in ('info', 'warn', 'error', 'debug')),
  event text not null,
  message text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index app_logs_created_idx on public.app_logs (created_at desc);

-- ---------- app config (dev passcode) ----------
create table public.app_config (
  key text primary key,
  value text not null
);

insert into public.app_config (key, value) values
  ('developer_passcode', 'island-dev-2026');

-- ---------- helpers ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_name text;
  raw_username text;
begin
  raw_username := lower(trim(coalesce(new.raw_user_meta_data ->> 'username', '')));
  raw_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(raw_username, ''),
    split_part(new.email, '@', 1),
    '岛民'
  );

  if raw_username = '' then
    raw_username := lower(regexp_replace(raw_name, '\s+', '_', 'g'));
  end if;

  insert into public.profiles (id, display_name, username)
  values (new.id, raw_name, raw_username);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.protect_developer_flag()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE'
     and new.is_developer is distinct from old.is_developer
     and current_setting('app.allow_dev_flag', true) is distinct from 'on' then
    new.is_developer := old.is_developer;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_developer_flag
  before update on public.profiles
  for each row execute function public.protect_developer_flag();

create or replace function public.unlock_developer(passcode text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return false;
  end if;

  if exists (
    select 1 from public.app_config
    where key = 'developer_passcode' and value = passcode
  ) then
    perform set_config('app.allow_dev_flag', 'on', true);
    update public.profiles
    set is_developer = true
    where id = auth.uid();
    return true;
  end if;

  return false;
end;
$$;

create or replace function public.lock_developer()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  perform set_config('app.allow_dev_flag', 'on', true);
  update public.profiles
  set is_developer = false
  where id = auth.uid();
end;
$$;

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.test_variants enable row level security;
alter table public.test_attempts enable row level security;
alter table public.app_logs enable row level security;
alter table public.app_config enable row level security;

-- profiles
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- variants: read-only for clients
create policy "variants_select_all"
  on public.test_variants for select
  to authenticated
  using (enabled = true);

-- attempts
create policy "attempts_select_own"
  on public.test_attempts for select
  to authenticated
  using (user_id = auth.uid());

create policy "attempts_select_leaderboard"
  on public.test_attempts for select
  to authenticated
  using (true);

create policy "attempts_insert_own"
  on public.test_attempts for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "attempts_delete_own"
  on public.test_attempts for delete
  to authenticated
  using (user_id = auth.uid());

-- logs: anyone authenticated can write; anon can write without user_id; only developers can read
create policy "logs_insert_authenticated"
  on public.app_logs for insert
  to authenticated
  with check (user_id is null or user_id = auth.uid());

create policy "logs_insert_anon"
  on public.app_logs for insert
  to anon
  with check (user_id is null);

create policy "logs_select_developer"
  on public.app_logs for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_developer = true
    )
  );

-- config: no direct client access (only via security definer functions)
-- (intentionally no policies)

grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.test_variants to authenticated;
grant select, insert, delete on public.test_attempts to authenticated;
grant select, insert on public.app_logs to authenticated;
grant insert on public.app_logs to anon;
grant select on public.daily_stats to authenticated;
grant execute on function public.unlock_developer(text) to authenticated;
grant execute on function public.lock_developer() to authenticated;

create or replace function public.is_username_available(p_username text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from public.profiles
    where lower(username) = lower(trim(p_username))
  );
$$;

grant execute on function public.is_username_available(text) to anon, authenticated;
