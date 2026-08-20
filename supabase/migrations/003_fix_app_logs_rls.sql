-- Fix app_logs insert for anonymous / pre-login events
-- Run in Supabase SQL Editor

drop policy if exists "logs_insert_authenticated" on public.app_logs;

create policy "logs_insert_authenticated"
  on public.app_logs for insert
  to authenticated
  with check (user_id is null or user_id = auth.uid());

create policy "logs_insert_anon"
  on public.app_logs for insert
  to anon
  with check (user_id is null);

grant insert on public.app_logs to anon;

notify pgrst, 'reload schema';
