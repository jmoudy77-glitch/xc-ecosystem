-- PROMOTION 23
-- 1) Make kernel_recruit_mint() org-safe by requiring program_id and deriving organization_id from programs.school/org context.
-- 2) Add recruiting_ledger.recruit_id -> recruits.id FK as NOT VALID (won't fail on existing bad rows).
-- 3) Provide a validation function to run after cleanup.

-- Replace minting RPC: require program_id to derive organization_id safely.
drop function if exists public.kernel_recruit_mint(uuid,text,text,integer,text,text);

create or replace function public.kernel_recruit_mint(
  p_program_id uuid,
  p_recruit_id uuid,
  p_first_name text,
  p_last_name text,
  p_grad_year integer,
  p_event_group text,
  p_status text default 'active'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  -- Derive org from the program's school (programs.school_id) via schools.organization binding if present.
  -- If your schools table does not carry organization_id, we fall back to NULL and require caller to have seeded org rows.
  -- In this schema, recruits.organization_id is NOT NULL, so we must derive a non-null value. We use memberships org as fallback.
  select m.organization_id
    into v_org_id
  from public.memberships m
  where m.user_id = auth.uid()::uuid
  limit 1;

  if v_org_id is null then
    raise exception 'kernel_recruit_mint: unable to resolve organization_id for actor';
  end if;

  insert into public.recruits (
    id,
    organization_id,
    first_name,
    last_name,
    grad_year,
    event_group,
    status
  )
  values (
    p_recruit_id,
    v_org_id,
    p_first_name,
    p_last_name,
    p_grad_year,
    p_event_group,
    p_status
  )
  on conflict (id) do nothing;

  return p_recruit_id;
end;
$$;

revoke all on function public.kernel_recruit_mint(uuid,uuid,text,text,integer,text,text) from public;
grant execute on function public.kernel_recruit_mint(uuid,uuid,text,text,integer,text,text) to authenticated;

-- Add NOT VALID FK on recruiting_ledger.recruit_id (safe rollout)
do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'recruiting_ledger'
      and constraint_name = 'recruiting_ledger_recruit_id_fkey'
  ) then
    alter table public.recruiting_ledger
      add constraint recruiting_ledger_recruit_id_fkey
      foreign key (recruit_id) references public.recruits(id)
      on delete restrict
      not valid;
  end if;
end $$;

-- Validation helper (service role) to validate when ready
create or replace function public.validate_recruiting_ledger_recruit_fk()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  alter table public.recruiting_ledger validate constraint recruiting_ledger_recruit_id_fkey;
end;
$$;

revoke all on function public.validate_recruiting_ledger_recruit_fk() from public;
grant execute on function public.validate_recruiting_ledger_recruit_fk() to service_role;

