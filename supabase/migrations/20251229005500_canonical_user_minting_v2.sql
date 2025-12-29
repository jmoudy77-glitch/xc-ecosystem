-- XC-Ecosystem Sovereign Runtime
-- Promotion 61: Canonical user minting v2 (trigger + backfill + email enforcement)

begin;

-- 1) Mint function (idempotent)
create or replace function public.kernel_user_mint_from_auth(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  select au.email into v_email
  from auth.users au
  where au.id = p_user_id;

  if v_email is null or length(trim(v_email)) = 0 then
    raise exception 'Cannot mint public.users: auth.users.email is NULL/empty for user_id=%', p_user_id;
  end if;

  insert into public.users (id, email)
  values (p_user_id, v_email)
  on conflict (id) do update set email = excluded.email;
end;
$$;

-- 2) Trigger: mint on auth user creation
create or replace function public.tg_mint_user_on_auth_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.kernel_user_mint_from_auth(new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.tg_mint_user_on_auth_insert();

-- 3) Backfill: mint any missing canonical citizens
do $$
declare
  r record;
begin
  for r in
    select au.id
    from auth.users au
    left join public.users u on u.id = au.id
    where u.id is null
  loop
    perform public.kernel_user_mint_from_auth(r.id);
  end loop;
end
$$;

commit;
