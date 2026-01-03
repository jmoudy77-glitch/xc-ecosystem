-- Recruiting M2/M3 foundation
-- Stores comparative, advisory-only impact estimates of recruits against recruitable deficits
-- Does NOT mutate Program Health or Recruiting State Signals

create table if not exists public.recruiting_candidate_impacts (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null,
  recruit_id uuid not null,
  sport text not null check (sport in ('xc','tf')),
  horizon text not null check (horizon in ('H0','H1','H2','H3')),
  capability_node_id uuid not null,
  impact_score numeric not null check (impact_score >= 0),
  cohort_tier integer not null check (cohort_tier between 0 and 3),
  rationale jsonb not null default '{}'::jsonb,
  inputs_hash text not null,
  created_at timestamptz not null default now(),
  canonical_event_id uuid
);

create index if not exists idx_recruiting_candidate_impacts_lookup
on public.recruiting_candidate_impacts (program_id, sport, horizon, cohort_tier, impact_score desc);

comment on table public.recruiting_candidate_impacts is
'Recruiting comparative advisory model: estimated deficit-reduction impact by recruit and capability node.';
