create table if not exists public.operational_workflow_steps (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.operational_workflows(id) on delete cascade,
  step_order integer not null,
  action text not null,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists workflow_steps_workflow_id_idx
  on public.operational_workflow_steps (workflow_id);

create unique index if not exists workflow_steps_unique_order_idx
  on public.operational_workflow_steps (workflow_id, step_order);
