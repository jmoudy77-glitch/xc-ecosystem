-- Program Health Registry: Drift Snapshots (module-governed)
-- Law anchor: genesis/module/program_health/ratified/50_runtime_data_law.md

create table if not exists public.program_health_drift_snapshots (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null,

  -- snapshot identity
  snapshot_at timestamptz not null default now(),
  runtime_id text not null default 'program_health',

  -- drift field payload (sector tensions, read-ray anchor, etc.)
  field jsonb not null default '{}'::jsonb,

  -- provenance (canonical)
  provenance jsonb not null default '{}'::jsonb, -- includes: promotion_id, issuer, source_tables

  created_at timestamptz not null default now()
);

create index if not exists program_health_drift_snapshots_program_at_idx
  on public.program_health_drift_snapshots(program_id, snapshot_at desc);
