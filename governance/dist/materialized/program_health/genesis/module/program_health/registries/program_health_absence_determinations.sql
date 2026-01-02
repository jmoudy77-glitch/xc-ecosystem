-- Program Health Registry: Absence Determinations (module-governed)
-- Law anchor: genesis/module/program_health/ratified/50_runtime_data_law.md

create table if not exists public.program_health_absence_determinations (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null,

  capability_node_id uuid not null references public.program_health_capability_nodes(id) on delete cascade,

  -- violation taxonomy (must remain within module law)
  violation_type text not null,           -- coverage|redundancy|certification|authority|integrity|continuity (enforced by app + law)
  severity text not null default 'med',   -- low|med|high|critical (app-enforced)
  confidence_class text not null default 'inferred', -- canonical|inferred

  -- truth-bearing payload
  determination jsonb not null default '{}'::jsonb,
  proof jsonb not null default '{}'::jsonb,         -- canonical sources if confidence_class=canonical

  -- provenance (canonical)
  provenance jsonb not null default '{}'::jsonb,    -- includes: promotion_id, issuer, source_tables, timestamp
  issued_at timestamptz not null default now(),

  created_at timestamptz not null default now()
);

create index if not exists program_health_absence_determinations_program_id_idx
  on public.program_health_absence_determinations(program_id);

create index if not exists program_health_absence_determinations_node_id_idx
  on public.program_health_absence_determinations(capability_node_id);

create index if not exists program_health_absence_determinations_issued_at_idx
  on public.program_health_absence_determinations(issued_at desc);
