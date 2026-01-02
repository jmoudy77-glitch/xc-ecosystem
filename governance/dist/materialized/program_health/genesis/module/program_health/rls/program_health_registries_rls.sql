-- Program Health RLS Policies (module-governed)
-- Law anchors:
-- - genesis/module/program_health/ratified/50_runtime_data_law.md
-- - genesis/module/program_health/ratified/60_registry_schemas.md
--
-- NOTE: This file is a governance artifact. Apply via Supabase migration when implementing.

-- ---------------------------------------------------------------------
-- Helper expectation:
-- A function exists that asserts membership in a program (or equivalent).
-- Replace `is_program_member(program_id)` with your canonical membership check.
-- ---------------------------------------------------------------------

-- Capability Nodes
alter table public.program_health_capability_nodes enable row level security;

drop policy if exists ph_capability_nodes_select on public.program_health_capability_nodes;
create policy ph_capability_nodes_select
  on public.program_health_capability_nodes
  for select
  using (
    is_program_member(program_id)
  );

drop policy if exists ph_capability_nodes_insert on public.program_health_capability_nodes;
create policy ph_capability_nodes_insert
  on public.program_health_capability_nodes
  for insert
  with check (
    is_program_member(program_id)
  );

drop policy if exists ph_capability_nodes_update on public.program_health_capability_nodes;
create policy ph_capability_nodes_update
  on public.program_health_capability_nodes
  for update
  using (
    is_program_member(program_id)
  )
  with check (
    is_program_member(program_id)
  );

drop policy if exists ph_capability_nodes_delete on public.program_health_capability_nodes;
create policy ph_capability_nodes_delete
  on public.program_health_capability_nodes
  for delete
  using (
    is_program_member(program_id)
  );

-- Absence Determinations
alter table public.program_health_absence_determinations enable row level security;

drop policy if exists ph_absence_select on public.program_health_absence_determinations;
create policy ph_absence_select
  on public.program_health_absence_determinations
  for select
  using (
    is_program_member(program_id)
  );

drop policy if exists ph_absence_insert on public.program_health_absence_determinations;
create policy ph_absence_insert
  on public.program_health_absence_determinations
  for insert
  with check (
    is_program_member(program_id)
  );

drop policy if exists ph_absence_update on public.program_health_absence_determinations;
create policy ph_absence_update
  on public.program_health_absence_determinations
  for update
  using (
    is_program_member(program_id)
  )
  with check (
    is_program_member(program_id)
  );

drop policy if exists ph_absence_delete on public.program_health_absence_determinations;
create policy ph_absence_delete
  on public.program_health_absence_determinations
  for delete
  using (
    is_program_member(program_id)
  );

-- Drift Snapshots
alter table public.program_health_drift_snapshots enable row level security;

drop policy if exists ph_drift_select on public.program_health_drift_snapshots;
create policy ph_drift_select
  on public.program_health_drift_snapshots
  for select
  using (
    is_program_member(program_id)
  );

drop policy if exists ph_drift_insert on public.program_health_drift_snapshots;
create policy ph_drift_insert
  on public.program_health_drift_snapshots
  for insert
  with check (
    is_program_member(program_id)
  );

drop policy if exists ph_drift_update on public.program_health_drift_snapshots;
create policy ph_drift_update
  on public.program_health_drift_snapshots
  for update
  using (
    is_program_member(program_id)
  )
  with check (
    is_program_member(program_id)
  );

drop policy if exists ph_drift_delete on public.program_health_drift_snapshots;
create policy ph_drift_delete
  on public.program_health_drift_snapshots
  for delete
  using (
    is_program_member(program_id)
  );
