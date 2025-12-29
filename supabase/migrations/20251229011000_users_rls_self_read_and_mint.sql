-- XC-Ecosystem Sovereign Runtime
-- Promotion 62: users RLS self-read + mint missing canonical citizens

begin;

-- 1) Ensure the canonical users table exists (do not alter columns here)
-- (Assumes your table already exists; this is a safe no-op if it does.)
create table if not exists public.users (
  id uuid primary key,
  email text not null
);

-- 2) Ensure RLS is enabled (idempotent)
alter table public.users enable row level security;

-- 3) Policy: authenticated user can SELECT their own row
drop policy if exists users_select_self on public.users;
create policy users_select_self
on public.users
for select
to authenticated
using (id = auth.uid());

-- 4) Mint any missing canonical citizens from auth.users (idempotent)
-- This handles your current actor and any other existing auth users.
insert into public.users (id, email)
select au.id, au.email
from auth.users au
left join public.users u on u.id = au.id
where u.id is null
  and au.email is not null
  and length(trim(au.email)) > 0;

commit;
