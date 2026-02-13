-- Backfill missing profiles for existing users
insert into public.profiles (id, email, role)
select id, email, 'student'
from auth.users
where id not in (select id from public.profiles);
