create table if not exists public.operational_workflow_run_step_transitions (
  id uuid primary key default gen_random_uuid(),
  run_step_id uuid not null references public.operational_workflow_run_steps(id) on delete cascade,
  from_status text,
  to_status text not null,
  message text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists workflow_run_step_transitions_run_step_id_idx
  on public.operational_workflow_run_step_transitions (run_step_id);

create index if not exists workflow_run_step_transitions_to_status_idx
  on public.operational_workflow_run_step_transitions (to_status);
