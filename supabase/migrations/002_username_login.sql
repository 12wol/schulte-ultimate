-- Username login (no real email / no email confirmation)
-- Run in Supabase SQL Editor after 001_init.sql

alter table public.profiles
  add column if not exists username text;

-- backfill from display_name for any existing rows
update public.profiles
set username = lower(regexp_replace(coalesce(display_name, 'islander'), '\s+', '_', 'g'))
where username is null or username = '';

-- ensure uniqueness (suffix if collision)
do $$
declare
  r record;
  base text;
  candidate text;
  n int;
begin
  for r in
    select id, username
    from public.profiles
    where username in (
      select username from public.profiles group by username having count(*) > 1
    )
  loop
    base := r.username;
    n := 1;
    loop
      candidate := base || '_' || n::text;
      exit when not exists (
        select 1 from public.profiles where username = candidate and id <> r.id
      );
      n := n + 1;
    end loop;
    update public.profiles set username = candidate where id = r.id;
  end loop;
end $$;

create unique index if not exists profiles_username_unique
  on public.profiles (lower(username));

alter table public.profiles
  alter column username set not null;

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

-- 让 API 立刻认出新函数（否则可能仍报 schema cache）
notify pgrst, 'reload schema';

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
