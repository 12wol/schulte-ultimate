-- 删除本地防护校验产生的测试账号与成绩
-- 在 Supabase SQL Editor 执行（会级联删掉 profiles / test_attempts）
-- 匹配规则：用户名 gtest + 8 位数字，例如 gtest31152127

select
  u.id,
  u.email,
  p.username,
  p.display_name,
  (
    select count(*)::int
    from public.test_attempts a
    where a.user_id = u.id
  ) as attempt_count
from auth.users u
left join public.profiles p on p.id = u.id
where u.email ~ '^gtest[0-9]{8}@island\.local$'
   or coalesce(p.username, '') ~ '^gtest[0-9]{8}$';

delete from public.app_logs
where event = 'test.guard';

delete from auth.users
where email ~ '^gtest[0-9]{8}@island\.local$';
