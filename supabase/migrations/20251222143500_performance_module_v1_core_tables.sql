-- File: supabase/migrations/performance_module_v1_core_tables.sql

-- Performance Module v1 (Intel-Prime) — Core Tables
-- NOTE: This migration is intentionally limited to deterministic truth + signals scaffolding.
-- AI briefs and visualization artifacts are intentionally excluded (ephemeral by contract).

-- Required extensions (most Supabase projects already have these enabled)
-- create extension if not exists pgcrypto;
-- create extension if not exists "uuid-ossp";

--------------------------------------------------------------------------------
-- Layer 1: Raw performance audit events (immutability with history)
--------------------------------------------------------------------------------

create table if not exists public.athlete_performance_events (
  id uuid primary key default gen_random_uuid(),
  performance_id uuid not null,
  event_type text not null check (event_type in ('created','corrected','voided','reinstated','source_updated')),
  patch_json jsonb not null default '{}'::jsonb,
  created_by_user_id uuid,
  created_at timestamptz not null default now(),
  constraint athlete_performance_events_performance_fkey
    foreign key (performance_id) references public.athlete_performances(id) on delete cascade,
  constraint athlete_performance_events_created_by_user_fkey
    foreign key (created_by_user_id) references public.users(id)
);

create index if not exists idx_athlete_performance_events_performance_id
  on public.athlete_performance_events(performance_id, created_at desc);

--------------------------------------------------------------------------------
-- Layer 2: Prime rulesets (versioned deterministic math specs)
--------------------------------------------------------------------------------

create table if not exists public.performance_prime_rulesets (
  id uuid primary key default gen_random_uuid(),
  ruleset_code text not null unique,            -- e.g., performance_prime_v1
  formula_spec_json jsonb not null,             -- explicit/traceable math specification
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

--------------------------------------------------------------------------------
-- Layer 2: Performance primes (one per raw performance per ruleset)
--------------------------------------------------------------------------------

create table if not exists public.performance_primes (
  id uuid primary key default gen_random_uuid(),
  ruleset_id uuid not null,
  performance_id uuid not null,
  athlete_id uuid not null,                     -- denormalized for query efficiency
  event_code text not null,                     -- original event
  canonical_event_code text not null,           -- normalized event identifier (e.g., mile -> 1600m)
  canonical_mark_seconds numeric,               -- normalized mark in seconds (timed events)
  canonical_mark_value numeric,                 -- normalized mark in unit value (field events)
  normalized_index numeric not null,            -- the prime index for this performance
  inputs_fingerprint text not null,             -- hash of exact input fields used
  computed_at timestamptz not null default now(),

  constraint performance_primes_ruleset_fkey
    foreign key (ruleset_id) references public.performance_prime_rulesets(id),
  constraint performance_primes_performance_fkey
    foreign key (performance_id) references public.athlete_performances(id) on delete cascade,
  constraint performance_primes_athlete_fkey
    foreign key (athlete_id) references public.athletes(id),

  constraint performance_primes_unique_ruleset_performance
    unique (ruleset_id, performance_id),

  constraint performance_primes_requires_canonical_mark
    check (canonical_mark_seconds is not null or canonical_mark_value is not null)
);

create index if not exists idx_performance_primes_athlete_event
  on public.performance_primes(athlete_id, canonical_event_code, computed_at desc);

create index if not exists idx_performance_primes_performance_id
  on public.performance_primes(performance_id);

--------------------------------------------------------------------------------
-- Lens registry (deterministic horizon + eligibility contracts)
--------------------------------------------------------------------------------

create table if not exists public.performance_lenses (
  lens_code text primary key,                   -- stable identifier, never repurposed
  subject_type text not null check (subject_type in ('athlete','team_season','team_window')),
  definition_json jsonb not null,               -- deterministic window rules + filters
  display_label text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  created_by_user_id uuid,
  constraint performance_lenses_created_by_user_fkey
    foreign key (created_by_user_id) references public.users(id)
);

create index if not exists idx_performance_lenses_subject_type
  on public.performance_lenses(subject_type);

--------------------------------------------------------------------------------
-- Layer 2 Rollups: Athlete rollups (brief substrates)
--------------------------------------------------------------------------------

create table if not exists public.athlete_performance_rollups (
  id uuid primary key default gen_random_uuid(),
  ruleset_id uuid not null,
  athlete_id uuid not null,
  lens_code text not null,

  current_index numeric not null,               -- “where are they now?”
  trend_slope numeric,                          -- slope over lens window
  trend_confidence numeric,                     -- 0..1 recommended (bounded here; enforced in compute)

  constraint athlete_rollups_trend_confidence_bounds
    check (trend_confidence is null or (trend_confidence >= 0 and trend_confidence <= 1)),

  volatility_index numeric,                     -- dispersion metric

  computed_at timestamptz not null default now(),
  inputs_fingerprint text not null,

  constraint athlete_rollups_ruleset_fkey
    foreign key (ruleset_id) references public.performance_prime_rulesets(id),
  constraint athlete_rollups_athlete_fkey
    foreign key (athlete_id) references public.athletes(id),
  constraint athlete_rollups_lens_fkey
    foreign key (lens_code) references public.performance_lenses(lens_code),

  constraint athlete_rollups_unique
    unique (ruleset_id, athlete_id, lens_code)
);

create index if not exists idx_athlete_rollups_athlete_lens
  on public.athlete_performance_rollups(athlete_id, lens_code, computed_at desc);

--------------------------------------------------------------------------------
-- Layer 2 Rollups: Team rollups (supports team_season + team_window)
--------------------------------------------------------------------------------

create table if not exists public.team_performance_rollups (
  id uuid primary key default gen_random_uuid(),
  ruleset_id uuid not null,
  program_id uuid not null,
  team_id uuid not null,
  team_season_id uuid,                          -- required when subject_type=team_season

  subject_type text not null check (subject_type in ('team_season','team_window')),
  subject_id uuid not null,                     -- subject identity: team_season => subject_id = team_season_id; team_window => subject_id = team_id
  lens_code text not null,

  -- mandatory structural outputs (JSON to avoid premature schema bloat)
  scoring_capacity_json jsonb not null default '{}'::jsonb,
  coverage_depth_json jsonb not null default '{}'::jsonb,

  team_trajectory_index numeric,
  team_volatility_index numeric,

  computed_at timestamptz not null default now(),
  inputs_fingerprint text not null,

  constraint team_rollups_ruleset_fkey
    foreign key (ruleset_id) references public.performance_prime_rulesets(id),
  constraint team_rollups_program_fkey
    foreign key (program_id) references public.programs(id),
  constraint team_rollups_team_fkey
    foreign key (team_id) references public.teams(id),
  constraint team_rollups_team_season_fkey
    foreign key (team_season_id) references public.team_seasons(id),
  constraint team_rollups_lens_fkey
    foreign key (lens_code) references public.performance_lenses(lens_code),

  constraint team_rollups_unique
    unique (ruleset_id, subject_type, subject_id, lens_code),

  -- enforce subject identity integrity
  constraint team_rollups_subject_integrity
    check (
      (subject_type = 'team_season' and team_season_id is not null and subject_id = team_season_id)
      or
      (subject_type = 'team_window' and team_season_id is null and subject_id = team_id)
    )
);

create index if not exists idx_team_rollups_team_lens
  on public.team_performance_rollups(team_id, lens_code, computed_at desc);

create index if not exists idx_team_rollups_program
  on public.team_performance_rollups(program_id, computed_at desc);

--------------------------------------------------------------------------------
-- Layer 3: Signal rulesets (versioned thresholds/specs)
--------------------------------------------------------------------------------

create table if not exists public.performance_signal_rulesets (
  id uuid primary key default gen_random_uuid(),
  ruleset_code text not null unique,            -- e.g., signals_v1
  rules_json jsonb not null,                    -- explicit threshold specs
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

--------------------------------------------------------------------------------
-- Layer 3: Signals (attention flags, not conclusions)
--------------------------------------------------------------------------------

create table if not exists public.performance_signals (
  id uuid primary key default gen_random_uuid(),
  ruleset_id uuid not null,
  subject_type text not null check (subject_type in ('athlete','team_season','team_window')),
  subject_id uuid not null,
  lens_code text not null,
  signal_code text not null,                    -- e.g., plateau_detected, volatility_shift
  severity integer not null default 1 check (severity between 1 and 5), -- calm scale
  evidence_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  constraint performance_signals_ruleset_fkey
    foreign key (ruleset_id) references public.performance_signal_rulesets(id),
  constraint performance_signals_lens_fkey
    foreign key (lens_code) references public.performance_lenses(lens_code)
);

create index if not exists idx_performance_signals_subject
  on public.performance_signals(subject_type, subject_id, lens_code, created_at desc);

create index if not exists idx_performance_signals_signal_code
  on public.performance_signals(signal_code);

--------------------------------------------------------------------------------
-- Seed: Canonical v1 lenses (global defaults)
-- Defaults exist so the briefing surface is usable without configuration.
-- Programs may later choose defaults, but math/definitions remain system-owned.
--------------------------------------------------------------------------------

insert into public.performance_lenses (lens_code, subject_type, definition_json, display_label, is_default)
values
  (
    'athlete_recent',
    'athlete',
    '{"window":"last_n","n":5,"include_types":["verified_meet","self_reported"],"exclude_voided":true}'::jsonb,
    'Recent (Last 5)',
    true
  ),
  (
    'athlete_season',
    'athlete',
    '{"window":"season","season_basis":"team_season","include_types":["verified_meet","self_reported"],"exclude_voided":true}'::jsonb,
    'This Season',
    true
  ),
  (
    'athlete_career',
    'athlete',
    '{"window":"career","include_types":["verified_meet","self_reported"],"exclude_voided":true}'::jsonb,
    'Career',
    false
  ),
  (
    'team_season',
    'team_season',
    '{"window":"season","season_basis":"team_season","aggregation":"scoring_depth","exclude_voided":true}'::jsonb,
    'Team (Season)',
    true
  ),
  (
    'team_window_3yr',
    'team_window',
    '{"window":"rolling","years":3,"aggregation":"scoring_depth","exclude_voided":true}'::jsonb,
    'Team (3-Year Window)',
    true
  )
on conflict (lens_code) do nothing;
