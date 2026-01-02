create table if not exists public.operational_workflow_schedules (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null,
  workflow_id uuid not null references public.operational_workflows(id) on delete cascade,
  name text not null,
  cron text not null,
  timezone text not null default 'UTC',
  is_enabled boolean not null default true,
  spec jsonb not null default '{}'::jsonb,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workflow_schedules_program_id_idx
  on public.operational_workflow_schedules (program_id);

create index if not exists workflow_schedules_workflow_id_idx
  on public.operational_workflow_schedules (workflow_id);

create index if not exists workflow_schedules_enabled_idx
  on public.operational_workflow_schedules (is_enabled);

create or replace function public.tg_set_updated_at_workflow_schedules()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_on_workflow_schedules on public.operational_workflow_schedules;
create trigger set_updated_at_on_workflow_schedules
before update on public.operational_workflow_schedules
for each row execute function public.tg_set_updated_at_workflow_schedules();
