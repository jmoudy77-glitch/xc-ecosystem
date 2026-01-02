create table if not exists public.operational_workflow_invocations (
  id uuid primary key default gen_random_uuid(),
  run_step_id uuid not null references public.operational_workflow_run_steps(id) on delete cascade,
  action_key text not null references public.operational_workflow_actions(key) on update cascade on delete restrict,
  status text not null default 'queued' check (status in ('queued','running','completed','failed')),
  started_at timestamptz,
  completed_at timestamptz,
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists workflow_invocations_run_step_id_idx
  on public.operational_workflow_invocations (run_step_id);

create index if not exists workflow_invocations_action_key_idx
  on public.operational_workflow_invocations (action_key);

create index if not exists workflow_invocations_status_idx
  on public.operational_workflow_invocations (status);
