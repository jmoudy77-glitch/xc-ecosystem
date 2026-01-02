-- Program Health Promotion Proposal Channel (NON-CANONICAL)
-- Purpose: Structured bridge from Repair Proposals -> Codex Promotions

create table if not exists public.program_health_promotion_proposals (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null,

  source_repair_id uuid not null,                 -- references inference repair (conceptual)
  status text not null default 'draft',           -- draft|ready|submitted|applied|rejected

  -- promotion envelope
  promotion_id text not null,                     -- YYYYMMDDNNNN placeholder or final
  domain text not null default 'program_health',
  primitive text not null,                        -- e.g., registry_repair|render_repair|provenance_repair|integrity_repair

  -- declared blast radius
  blast_repo_files text[] not null default '{}',
  blast_db_surfaces text[] not null default '{}',
  blast_api_routes text[] not null default '{}',

  -- executable plan (still NON-CANONICAL)
  operations jsonb not null default '{}'::jsonb,

  provenance jsonb not null default '{}'::jsonb,  -- issuer, source_tables, timestamps
  created_at timestamptz not null default now()
);

create index if not exists ph_promo_prop_program_id_idx
  on public.program_health_promotion_proposals(program_id);

create index if not exists ph_promo_prop_status_idx
  on public.program_health_promotion_proposals(status);
