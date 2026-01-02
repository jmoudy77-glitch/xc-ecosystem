-- Program Health Inference Registry: Drift Snapshots (NON-CANONICAL)
-- Purpose: Safe staging for speculative drift fields prior to promotion.

create table if not exists public.program_health_inference_drift (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null,

  snapshot_at timestamptz not null default now(),
  runtime_id text not null default 'program_health',

  field jsonb not null default '{}'::jsonb,      -- speculative field payload
  provenance jsonb not null default '{}'::jsonb, -- issuer, source_tables, timestamp

  created_at timestamptz not null default now()
);

create index if not exists ph_inf_drift_program_at_idx
  on public.program_health_inference_drift(program_id, snapshot_at desc);
