-- Recruiting M3 runtime foundations (dormant by default)
-- - Global activation flag store (service-role only via RLS/no policies)
-- - Program eligibility store (service-role only via RLS/no policies)
-- - recruiting_candidate_impacts table (service-role write; RLS on/no policies)
--
-- NOTE: This migration intentionally creates NO permissive RLS policies.
-- Service role bypasses RLS; application access must be mediated via server APIs.

begin;

-- 1) Global runtime activation flags
create table if not exists public.system_runtime_flags (
  runtime_key text primary key,
  is_active boolean not null default false,
  activated_at timestamptz null,
  activated_by_user_id uuid null,
  notes text null,
  updated_at timestamptz not null default now()
);

-- Ensure RLS is enabled (service role bypass; no policies => no direct app reads)
alter table public.system_runtime_flags enable row level security;

-- Seed recruiting_m3 flag row (idempotent)
insert into public.system_runtime_flags (runtime_key, is_active, notes)
values ('recruiting_m3', false, 'default dormant')
on conflict (runtime_key) do nothing;

-- 2) Program eligibility store (program-scoped; team consumes via program_id)
create table if not exists public.recruiting_m3_program_eligibility (
  program_id uuid primary key references public.programs(id) on delete cascade,
  status text not null default 'unknown',
  reason_codes text[] not null default '{}'::text[],
  min_data_snapshot jsonb null,
  computed_at timestamptz not null default now(),
  computed_by text not null default 'system'
);

alter table public.recruiting_m3_program_eligibility enable row level security;

-- 3) Candidate impacts (M3 output primitive)
create table if not exists public.recruiting_candidate_impacts (
  id uuid primary key default gen_random_uuid(),

  program_id uuid not null references public.programs(id) on delete cascade,
  recruit_id uuid not null,
  capability_node_id uuid not null,

  horizon text not null,

  impact_score numeric not null,
  cohort_tier integer not null,

  rationale text not null,
  inputs_hash text not null,

  created_at timestamptz not null default now()
);

alter table public.recruiting_candidate_impacts enable row level security;

-- Canon-aligned uniqueness to prevent accidental duplicates while allowing recompute via new inputs_hash
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'recruiting_candidate_impacts_unique_fingerprint'
      and conrelid = 'public.recruiting_candidate_impacts'::regclass
  ) then
    alter table public.recruiting_candidate_impacts
      add constraint recruiting_candidate_impacts_unique_fingerprint
      unique (program_id, recruit_id, capability_node_id, horizon, inputs_hash);
  end if;
end $$;

-- Indexes
create index if not exists recruiting_candidate_impacts_program_node_horizon_idx
  on public.recruiting_candidate_impacts (program_id, capability_node_id, horizon);

create index if not exists recruiting_candidate_impacts_program_recruit_idx
  on public.recruiting_candidate_impacts (program_id, recruit_id);

create index if not exists recruiting_m3_program_eligibility_status_idx
  on public.recruiting_m3_program_eligibility (status);

commit;
