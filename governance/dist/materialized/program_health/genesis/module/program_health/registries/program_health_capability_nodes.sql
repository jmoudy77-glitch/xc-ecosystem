-- Program Health Registry: Capability Nodes (module-governed)
-- Law anchor: genesis/module/program_health/ratified/50_runtime_data_law.md

create table if not exists public.program_health_capability_nodes (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null,

  -- stable identity + taxonomy
  node_key text not null,                 -- stable, human-legible key (unique per program)
  domain text not null,                   -- capability domain (e.g., "coverage", "redundancy", etc. as defined by module)
  title text not null,
  description text not null default '',

  -- ownership + authority semantics
  owner_role text not null default 'system',
  authority_scope text not null default 'program',

  -- certification / coverage semantics (optional but canonical fields)
  certification_state text not null default 'unknown',
  coverage_scope jsonb not null default '{}'::jsonb,

  -- provenance (canonical)
  provenance jsonb not null default '{}'::jsonb,  -- includes: promotion_id, issuer, source_tables
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint program_health_capability_nodes_program_node_key_uq unique (program_id, node_key)
);

create index if not exists program_health_capability_nodes_program_id_idx
  on public.program_health_capability_nodes(program_id);
