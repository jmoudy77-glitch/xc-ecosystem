-- ====================================================================
-- Program Health A1 (S1) — Law Tables (Amendment-bound)
-- ====================================================================

create table if not exists public.capability_nodes (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  node_code text not null,
  name text not null,
  scope_type text not null default 'program' check (scope_type in ('program','team')),
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(program_id, node_code)
);

create table if not exists public.authority_edges (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  from_role text not null,
  to_capability_node_id uuid not null references public.capability_nodes(id) on delete cascade,
  authority_type text not null default 'standard',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(program_id, from_role, to_capability_node_id, authority_type)
);

create table if not exists public.certification_constraints (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  capability_node_id uuid not null references public.capability_nodes(id) on delete cascade,
  cert_type text not null,
  min_count integer not null default 1 check (min_count >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(program_id, capability_node_id, cert_type)
);

create table if not exists public.coverage_requirements (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  capability_node_id uuid not null references public.capability_nodes(id) on delete cascade,
  min_coverage integer not null default 1 check (min_coverage >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(program_id, capability_node_id)
);

create table if not exists public.redundancy_depths (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  capability_node_id uuid not null references public.capability_nodes(id) on delete cascade,
  min_depth integer not null default 0 check (min_depth >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(program_id, capability_node_id)
);

create table if not exists public.horizon_fragility_vectors (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  capability_node_id uuid not null references public.capability_nodes(id) on delete cascade,
  h0 integer not null default 0 check (h0 >= 0),
  h1 integer not null default 0 check (h1 >= 0),
  h2 integer not null default 0 check (h2 >= 0),
  h3 integer not null default 0 check (h3 >= 0),
  created_at timestamptz not null default now(),
  unique(program_id, capability_node_id)
);

-- ====================================================================
-- Program Health A1 (S1) — State Tables (Program reality inputs)
-- ====================================================================

create table if not exists public.program_staff_roles (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  program_member_id uuid not null references public.program_members(id) on delete cascade,
  role_code text not null,
  is_active boolean not null default true,
  effective_start_date date,
  effective_end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(program_id, program_member_id, role_code)
);

create table if not exists public.program_staff_certifications (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  program_member_id uuid not null references public.program_members(id) on delete cascade,
  cert_type text not null,
  status text not null default 'active' check (status in ('active','expired','revoked','pending')),
  issued_at date,
  expires_at date,
  evidence_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(program_id, program_member_id, cert_type)
);

create table if not exists public.program_capability_assignments (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  program_member_id uuid not null references public.program_members(id) on delete cascade,
  capability_node_id uuid not null references public.capability_nodes(id) on delete cascade,
  coverage_type text not null default 'secondary' check (coverage_type in ('primary','secondary')),
  is_active boolean not null default true,
  effective_start_date date,
  effective_end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(program_id, program_member_id, capability_node_id)
);

create table if not exists public.program_authority_assignments (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  program_member_id uuid not null references public.program_members(id) on delete cascade,
  authority_type text not null default 'standard',
  is_active boolean not null default true,
  effective_start_date date,
  effective_end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(program_id, program_member_id, authority_type)
);

-- ====================================================================
-- Program Health A1 (S1) — Compute Queue / Runs (mirrors performance pattern)
-- ====================================================================

create table if not exists public.program_health_compute_queue (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  reason text not null default 'manual_recompute',
  details_json jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued','processing','done','failed','canceled')),
  attempts integer not null default 0 check (attempts >= 0),
  not_before timestamptz,
  locked_at timestamptz,
  locked_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.program_health_compute_runs (
  id uuid primary key default gen_random_uuid(),
  queue_id uuid references public.program_health_compute_queue(id) on delete set null,
  program_id uuid not null references public.programs(id) on delete cascade,
  stages jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running','succeeded','failed','partial')),
  summary_json jsonb not null default '{}'::jsonb,
  error_json jsonb,
  created_at timestamptz not null default now()
);

-- ====================================================================
-- Program Health A1 (S1) — Trace Tables
-- ====================================================================

create table if not exists public.provenance_meta (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  engine_code text not null,
  run_id uuid,
  source text not null default 'program_health_engine',
  system_time timestamptz not null default now(),
  mutation_state text not null default 'pre_freeze' check (mutation_state in ('pre_freeze','frozen')),
  meta_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.lineage_edges (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  from_table text not null,
  from_id uuid not null,
  to_table text not null,
  to_id uuid not null,
  relation_type text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.freeze_markers (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  horizon text not null check (horizon in ('H0','H1','H2','H3')),
  window_start timestamptz not null,
  window_end timestamptz not null,
  system_time timestamptz not null default now(),
  boundary_source text not null default 'system',
  created_at timestamptz not null default now(),
  unique(program_id, horizon, window_start, window_end)
);

create table if not exists public.audit_links (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  audit_ref text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.appeal_intake_links (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  determination_id uuid not null,
  status text not null default 'eligible' check (status in ('eligible','filed','reviewing','resolved','denied')),
  created_at timestamptz not null default now()
);

-- ====================================================================
-- Program Health A1 (S1) — Execution Outputs (freeze-bound)
-- ====================================================================

create table if not exists public.capability_snapshots (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  as_of_system_time timestamptz not null,
  horizon text not null check (horizon in ('H0','H1','H2','H3')),
  snapshot_json jsonb not null default '{}'::jsonb,
  provenance_id uuid references public.provenance_meta(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.absence_determinations (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  capability_node_id uuid not null references public.capability_nodes(id) on delete cascade,
  violation_type text not null check (violation_type in ('coverage','redundancy','certification','authority')),
  horizon text not null check (horizon in ('H0','H1','H2','H3')),
  freeze_marker_id uuid references public.freeze_markers(id) on delete set null,
  provenance_id uuid references public.provenance_meta(id) on delete set null,
  audit_link_id uuid references public.audit_links(id) on delete set null,
  evidence_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(program_id, capability_node_id, violation_type, horizon, freeze_marker_id)
);

alter table public.appeal_intake_links
  add constraint appeal_intake_links_determination_fkey
  foreign key (determination_id) references public.absence_determinations(id) on delete cascade;

-- ====================================================================
-- Indexes (minimum viable for execution)
-- ====================================================================

create index if not exists idx_cap_nodes_program on public.capability_nodes(program_id);
create index if not exists idx_abs_det_program on public.absence_determinations(program_id);
create index if not exists idx_abs_det_program_horizon on public.absence_determinations(program_id, horizon);
create index if not exists idx_staff_roles_program on public.program_staff_roles(program_id);
create index if not exists idx_cap_assign_program on public.program_capability_assignments(program_id);

-- ====================================================================
-- RLS — Program member access (read), server writes (intended)
-- NOTE: Service role bypasses RLS in Supabase. Authenticated users are
-- granted read where they are members of the program.
-- ====================================================================

-- Helper policy predicate (inline repeated via EXISTS) uses:
-- public.users(auth_id) ↔ public.program_members(user_id)

-- Enable RLS
alter table public.capability_nodes enable row level security;
alter table public.authority_edges enable row level security;
alter table public.certification_constraints enable row level security;
alter table public.coverage_requirements enable row level security;
alter table public.redundancy_depths enable row level security;
alter table public.horizon_fragility_vectors enable row level security;

alter table public.program_staff_roles enable row level security;
alter table public.program_staff_certifications enable row level security;
alter table public.program_capability_assignments enable row level security;
alter table public.program_authority_assignments enable row level security;

alter table public.program_health_compute_queue enable row level security;
alter table public.program_health_compute_runs enable row level security;

alter table public.provenance_meta enable row level security;
alter table public.lineage_edges enable row level security;
alter table public.freeze_markers enable row level security;
alter table public.audit_links enable row level security;
alter table public.appeal_intake_links enable row level security;

alter table public.capability_snapshots enable row level security;
alter table public.absence_determinations enable row level security;

-- Read policies (program members)
create policy "ph_read_capability_nodes"
on public.capability_nodes for select
 to authenticated
using (
  exists (
    select 1
    from public.users u
    join public.program_members pm on pm.user_id = u.id
    where u.auth_id = auth.uid()
      and pm.program_id = capability_nodes.program_id
  )
);

create policy "ph_read_absence_determinations"
on public.absence_determinations for select
 to authenticated
using (
  exists (
    select 1
    from public.users u
    join public.program_members pm on pm.user_id = u.id
    where u.auth_id = auth.uid()
      and pm.program_id = absence_determinations.program_id
  )
);

-- Apply same read rule to the rest (minimal; expand later as needed)
create policy "ph_read_program_scoped_law_tables"
on public.authority_edges for select
 to authenticated
using (exists (
  select 1 from public.users u
  join public.program_members pm on pm.user_id = u.id
  where u.auth_id = auth.uid() and pm.program_id = authority_edges.program_id
));

create policy "ph_read_program_scoped_constraints"
on public.certification_constraints for select
 to authenticated
using (exists (
  select 1 from public.users u
  join public.program_members pm on pm.user_id = u.id
  where u.auth_id = auth.uid() and pm.program_id = certification_constraints.program_id
));

create policy "ph_read_program_scoped_requirements"
on public.coverage_requirements for select
 to authenticated
using (exists (
  select 1 from public.users u
  join public.program_members pm on pm.user_id = u.id
  where u.auth_id = auth.uid() and pm.program_id = coverage_requirements.program_id
));

create policy "ph_read_program_scoped_redundancy"
on public.redundancy_depths for select
 to authenticated
using (exists (
  select 1 from public.users u
  join public.program_members pm on pm.user_id = u.id
  where u.auth_id = auth.uid() and pm.program_id = redundancy_depths.program_id
));

create policy "ph_read_program_scoped_fragility"
on public.horizon_fragility_vectors for select
 to authenticated
using (exists (
  select 1 from public.users u
  join public.program_members pm on pm.user_id = u.id
  where u.auth_id = auth.uid() and pm.program_id = horizon_fragility_vectors.program_id
));

create policy "ph_read_program_staff_roles"
on public.program_staff_roles for select
 to authenticated
using (exists (
  select 1 from public.users u
  join public.program_members pm on pm.user_id = u.id
  where u.auth_id = auth.uid() and pm.program_id = program_staff_roles.program_id
));

create policy "ph_read_program_staff_certifications"
on public.program_staff_certifications for select
 to authenticated
using (exists (
  select 1 from public.users u
  join public.program_members pm on pm.user_id = u.id
  where u.auth_id = auth.uid() and pm.program_id = program_staff_certifications.program_id
));

create policy "ph_read_program_capability_assignments"
on public.program_capability_assignments for select
 to authenticated
using (exists (
  select 1 from public.users u
  join public.program_members pm on pm.user_id = u.id
  where u.auth_id = auth.uid() and pm.program_id = program_capability_assignments.program_id
));

create policy "ph_read_program_authority_assignments"
on public.program_authority_assignments for select
 to authenticated
using (exists (
  select 1 from public.users u
  join public.program_members pm on pm.user_id = u.id
  where u.auth_id = auth.uid() and pm.program_id = program_authority_assignments.program_id
));

create policy "ph_read_program_health_queue"
on public.program_health_compute_queue for select
 to authenticated
using (exists (
  select 1 from public.users u
  join public.program_members pm on pm.user_id = u.id
  where u.auth_id = auth.uid() and pm.program_id = program_health_compute_queue.program_id
));

create policy "ph_read_program_health_runs"
on public.program_health_compute_runs for select
 to authenticated
using (exists (
  select 1 from public.users u
  join public.program_members pm on pm.user_id = u.id
  where u.auth_id = auth.uid() and pm.program_id = program_health_compute_runs.program_id
));

create policy "ph_read_trace_tables_provenance"
on public.provenance_meta for select
 to authenticated
using (exists (
  select 1 from public.users u
  join public.program_members pm on pm.user_id = u.id
  where u.auth_id = auth.uid() and pm.program_id = provenance_meta.program_id
));

create policy "ph_read_trace_tables_lineage"
on public.lineage_edges for select
 to authenticated
using (exists (
  select 1 from public.users u
  join public.program_members pm on pm.user_id = u.id
  where u.auth_id = auth.uid() and pm.program_id = lineage_edges.program_id
));

create policy "ph_read_trace_tables_freeze"
on public.freeze_markers for select
 to authenticated
using (exists (
  select 1 from public.users u
  join public.program_members pm on pm.user_id = u.id
  where u.auth_id = auth.uid() and pm.program_id = freeze_markers.program_id
));

create policy "ph_read_trace_tables_audit"
on public.audit_links for select
 to authenticated
using (exists (
  select 1 from public.users u
  join public.program_members pm on pm.user_id = u.id
  where u.auth_id = auth.uid() and pm.program_id = audit_links.program_id
));

create policy "ph_read_trace_tables_appeals"
on public.appeal_intake_links for select
 to authenticated
using (exists (
  select 1 from public.users u
  join public.program_members pm on pm.user_id = u.id
  where u.auth_id = auth.uid() and pm.program_id = appeal_intake_links.program_id
));

create policy "ph_read_capability_snapshots"
on public.capability_snapshots for select
 to authenticated
using (exists (
  select 1 from public.users u
  join public.program_members pm on pm.user_id = u.id
  where u.auth_id = auth.uid() and pm.program_id = capability_snapshots.program_id
));
