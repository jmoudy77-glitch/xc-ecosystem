-- XC-Ecosystem Sovereign Runtime
-- Promotion 57: Canonical User Minting

begin;

-- Create canonical users table if missing (safe guard)
create table if not exists public.users (
  id uuid primary key,
  email text,
  created_at timestamptz not null default now()
);

-- Mint canonical citizen on auth signup
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

commit;
