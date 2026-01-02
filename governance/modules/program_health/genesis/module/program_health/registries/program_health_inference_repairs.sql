-- Program Health Inference Registry: Repair Proposals (NON-CANONICAL)
-- Purpose: Safe staging for assistant-suggested repairs prior to promotion.

create table if not exists public.program_health_inference_repairs (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null,

  target_type text not null,                    -- capability_node | absence | drift
  target_id uuid null,

  proposal jsonb not null default '{}'::jsonb,  -- steps, files, blast radius, rationale
  provenance jsonb not null default '{}'::jsonb, -- issuer, source_tables, timestamp

  proposed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists ph_inf_repairs_program_at_idx
  on public.program_health_inference_repairs(program_id, proposed_at desc);
