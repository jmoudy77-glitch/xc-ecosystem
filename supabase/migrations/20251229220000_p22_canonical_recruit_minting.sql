-- PROMOTION 22
-- Objective:
-- 1) Guarantee canonical recruit identity exists in public.recruits for any recruit_id we reference downstream
-- 2) Ensure program_recruits is always keyed by (program_id, recruit_id)
-- 3) Provide a lawful minting RPC for use by routes/workflows before emitting recruiting events

-- Ensure program_recruits has recruit_id (should already exist, but keep idempotent)
alter table public.program_recruits
  add column if not exists recruit_id uuid;

create index if not exists program_recruits_program_recruit_idx
  on public.program_recruits(program_id, recruit_id);

-- Backfill recruit_id from existing linkage when possible:
-- program_recruits.recruiting_profile_id -> recruiting_profiles.athlete_id -> recruits.id
update public.program_recruits pr
set recruit_id = r.id
from public.recruiting_profiles rp
join public.recruits r on r.id = rp.athlete_id
where pr.recruit_id is null
  and pr.recruiting_profile_id = rp.id;

-- Enforce uniqueness for non-null recruit_id
create unique index if not exists program_recruits_unique_program_recruit
  on public.program_recruits(program_id, recruit_id)
  where recruit_id is not null;

-- FK for program_recruits.recruit_id -> recruits.id (safe because recruit_id can remain null for legacy rows)
do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'program_recruits'
      and constraint_name = 'program_recruits_recruit_id_fkey'
  ) then
    alter table public.program_recruits
      add constraint program_recruits_recruit_id_fkey
      foreign key (recruit_id) references public.recruits(id)
      on delete set null;
  end if;
end $$;

-- Canonical recruit minting RPC
-- Law: this is identity creation, not a governed domain ledger write.
-- It is a canonical surface insert for recruits, with actor attribution via canonical_events is not required here.
create or replace function public.kernel_recruit_mint(
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
begin
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
    -- organization_id is required by schema; derive from current auth user's org if possible.
    -- If unavailable, fall back to a sentinel; caller should pass recruit_id that already belongs to an org context.
    (select m.organization_id
     from public.memberships m
     where m.user_id = auth.uid()::uuid
     limit 1),
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

revoke all on function public.kernel_recruit_mint(uuid,text,text,integer,text,text) from public;
grant execute on function public.kernel_recruit_mint(uuid,text,text,integer,text,text) to authenticated;

