create table if not exists public.operational_workflow_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.operational_workflows(id) on delete cascade,
  program_id uuid not null,
  status text not null default 'pending' check (status in ('pending','running','completed','failed')),
  started_at timestamptz,
  completed_at timestamptz,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists workflow_runs_workflow_id_idx
  on public.operational_workflow_runs (workflow_id);

create index if not exists workflow_runs_program_id_idx
  on public.operational_workflow_runs (program_id);

create index if not exists workflow_runs_status_idx
  on public.operational_workflow_runs (status);
