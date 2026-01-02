-- Program Health Inference Registry: Absence Proposals (NON-CANONICAL)
-- Law anchors:
-- - genesis/module/program_health/ratified/50_runtime_data_law.md
-- - genesis/module/program_health/ratified/70_read_contract.md
-- Purpose: Safe staging for speculative / assistant-proposed absences prior to promotion.

create table if not exists public.program_health_inference_absences (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null,

  capability_node_id uuid not null,
  violation_type text not null,                 -- must match lawful taxonomy
  severity text not null default 'med',
  confidence_class text not null default 'inferred',

  proposal jsonb not null default '{}'::jsonb,  -- rationale, signals, heuristics
  proof jsonb not null default '{}'::jsonb,     -- optional speculative proof

  provenance jsonb not null default '{}'::jsonb, -- issuer, source_tables, timestamp
  proposed_at timestamptz not null default now(),

  created_at timestamptz not null default now()
);

create index if not exists ph_inf_absences_program_id_idx
  on public.program_health_inference_absences(program_id);

create index if not exists ph_inf_absences_node_id_idx
  on public.program_health_inference_absences(capability_node_id);

create index if not exists ph_inf_absences_proposed_at_idx
  on public.program_health_inference_absences(proposed_at desc);
