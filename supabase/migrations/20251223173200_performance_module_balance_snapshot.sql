-- Performance Module v1 — Balance snapshot history (for percentiles + equilibrium boolean)
-- Migration: 20251223HHMMSS_performance_module_v1_balance_snapshots.sql

create table if not exists public.performance_balance_snapshots (
  id uuid primary key default gen_random_uuid(),

  -- scope ownership
  program_id uuid not null references public.programs(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  team_season_id uuid references public.team_seasons(id) on delete set null,

  -- lens (must match your existing lens_code scheme)
  lens_code text not null references public.performance_lenses(lens_code),

  -- auditable window definition (lens-specific usage)
  window_start_date date,
  window_end_date date,

  -- deterministic outputs for the 5 dichotomies + composite
  pairs_json jsonb not null default '{}'::jsonb,
  -- shape:
  -- {
  --   "training_load_vs_readiness": { "tension": 0.42, "severity": 0.61, "percentile": 0.83 },
  --   "individual_dev_vs_team_perf": { ... },
  --   ...
  -- }

  aggregate_percentile numeric,         -- 0..1 (optional until history exists)
  is_out_of_equilibrium boolean not null default false,

  -- provenance / audit
  rollup_ruleset_code text,             -- e.g. "team_rollups_v1"
  prime_ruleset_code text,              -- e.g. "performance_prime_v1"
  computed_at timestamptz not null default now(),

  created_at timestamptz not null default now()
);

-- Uniqueness: one snapshot per lens + window for a given scope
create unique index if not exists performance_balance_snapshots_unique
  on public.performance_balance_snapshots (
    program_id,
    coalesce(team_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(team_season_id, '00000000-0000-0000-0000-000000000000'::uuid),
    lens_code,
    coalesce(window_start_date, '1900-01-01'::date),
    coalesce(window_end_date, '1900-01-01'::date)
  );

create index if not exists idx_perf_balance_snapshots_lookup
  on public.performance_balance_snapshots(program_id, lens_code, computed_at desc);

create index if not exists idx_perf_balance_snapshots_season
  on public.performance_balance_snapshots(team_season_id, lens_code, computed_at desc);