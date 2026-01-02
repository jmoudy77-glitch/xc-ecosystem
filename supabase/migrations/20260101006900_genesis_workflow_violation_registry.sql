create table if not exists public.operational_workflow_violation_registry (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null,
  entity_type text not null,
  entity_id uuid not null,
  violation_type text not null,
  severity text not null check (severity in ('low','medium','high','critical')),
  status text not null default 'open',
  detected_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists idx_op_wf_violation_program on public.operational_workflow_violation_registry(program_id);
create index if not exists idx_op_wf_violation_status on public.operational_workflow_violation_registry(status);
