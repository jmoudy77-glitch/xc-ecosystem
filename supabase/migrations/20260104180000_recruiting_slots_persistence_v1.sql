-- supabase/migrations/20260104180000_recruiting_slots_persistence_v1.sql
-- PH A2 sandbox integration (v1): persist Recruiting slot assignments + expose PRIMARY-only mapping RPC.

create table if not exists public.recruiting_slot_assignments (
  id uuid primary key default gen_random_uuid(),

  program_id uuid not null,
  sport text not null default 'xc',

  -- Event group identity is Recruiting-canonical (e.g., "800m", "5k", etc.)
  event_group_key text not null,

  -- Slot identity is Recruiting-canonical (string, stable within event_group_key)
  slot_id text not null,

  athlete_id uuid not null,

  -- Locked semantics: only these two classes exist for this surface.
  athlete_type text not null check (athlete_type in ('returning', 'recruit')),

  -- Locked semantics: a slot has exactly 0..1 primary at any time.
  is_primary boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.recruiting_slot_assignments is
'Recruiting primary surface persistence: slot occupancy (PRIMARY/SECONDARY) per program + sport + event_group_key + slot_id.';

comment on column public.recruiting_slot_assignments.event_group_key is
'Recruiting event group key (canonical grouping).';

comment on column public.recruiting_slot_assignments.slot_id is
'Recruiting slot identifier within event group.';

comment on column public.recruiting_slot_assignments.is_primary is
'PRIMARY flag. Exactly 0..1 rows per slot may be true at any time.';

create index if not exists recruiting_slot_assignments_program_idx
  on public.recruiting_slot_assignments(program_id, sport);

create index if not exists recruiting_slot_assignments_slot_idx
  on public.recruiting_slot_assignments(program_id, sport, event_group_key, slot_id);

create index if not exists recruiting_slot_assignments_athlete_idx
  on public.recruiting_slot_assignments(program_id, sport, athlete_id);

-- Prevent duplicate athlete rows within the same slot.
create unique index if not exists recruiting_slot_assignments_slot_athlete_uniq
  on public.recruiting_slot_assignments(program_id, sport, event_group_key, slot_id, athlete_id);

-- Enforce recruit uniqueness within an event group: a recruit may exist in only one slot per event group.
-- Returning athletes are allowed to exist in multiple slots in the future if needed, but Recruiting UI will not create that.
create unique index if not exists recruiting_slot_assignments_recruit_event_group_uniq
  on public.recruiting_slot_assignments(program_id, sport, event_group_key, athlete_id)
  where athlete_type = 'recruit';

-- Enforce single PRIMARY per slot.
create unique index if not exists recruiting_slot_assignments_primary_per_slot_uniq
  on public.recruiting_slot_assignments(program_id, sport, event_group_key, slot_id)
  where is_primary = true;

-- updated_at trigger
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_recruiting_slot_assignments_updated_at on public.recruiting_slot_assignments;
create trigger trg_recruiting_slot_assignments_updated_at
before update on public.recruiting_slot_assignments
for each row
execute function public.tg_set_updated_at();

-- RLS: default deny; PRIMARY mapping is exposed via SECURITY DEFINER RPC.
alter table public.recruiting_slot_assignments enable row level security;

-- Explicitly remove any prior policies if re-running.
drop policy if exists "rsa_no_access_authenticated" on public.recruiting_slot_assignments;

-- Deny-by-default for authenticated; reads should go through RPC until membership policy is wired.
create policy "rsa_no_access_authenticated"
on public.recruiting_slot_assignments
for all
to authenticated
using (false)
with check (false);

-- Read surface: PRIMARY-only mapping for PH A2 sandbox consumption.
create or replace function public.rpc_ph_a2_primary_mapping_v1(
  p_program_id uuid,
  p_sport text default 'xc'
)
returns table (
  program_id uuid,
  sport text,
  event_group_key text,
  slot_id text,
  primary_athlete_id uuid
)
language sql
security definer
set search_path = public
as $$
  select
    rsa.program_id,
    rsa.sport,
    rsa.event_group_key,
    rsa.slot_id,
    rsa.athlete_id as primary_athlete_id
  from public.recruiting_slot_assignments rsa
  where rsa.program_id = p_program_id
    and rsa.sport = coalesce(p_sport, 'xc')
    and rsa.is_primary = true
  order by rsa.event_group_key, rsa.slot_id;
$$;

comment on function public.rpc_ph_a2_primary_mapping_v1(uuid, text) is
'PH A2 sandbox read surface (v1): returns PRIMARY-only mapping from Recruiting slot assignments.';

grant execute on function public.rpc_ph_a2_primary_mapping_v1(uuid, text) to authenticated;
