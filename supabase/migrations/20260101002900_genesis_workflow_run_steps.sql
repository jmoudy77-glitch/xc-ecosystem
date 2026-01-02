create table if not exists public.operational_workflow_run_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.operational_workflow_runs(id) on delete cascade,
  workflow_step_id uuid not null references public.operational_workflow_steps(id) on delete restrict,
  step_order integer not null,
  status text not null default 'pending' check (status in ('pending','running','completed','failed','skipped')),
  started_at timestamptz,
  completed_at timestamptz,
  output jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists workflow_run_steps_run_id_idx
  on public.operational_workflow_run_steps (run_id);

create index if not exists workflow_run_steps_status_idx
  on public.operational_workflow_run_steps (status);

create unique index if not exists workflow_run_steps_unique_order_idx
  on public.operational_workflow_run_steps (run_id, step_order);
