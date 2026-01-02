create table if not exists public.operational_workflows (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null,
  name text not null,
  spec jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active','paused','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists operational_workflows_program_id_idx
  on public.operational_workflows (program_id);

create index if not exists operational_workflows_status_idx
  on public.operational_workflows (status);

create or replace function public.tg_set_updated_at_operational_workflows()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_on_operational_workflows on public.operational_workflows;
create trigger set_updated_at_on_operational_workflows
before update on public.operational_workflows
for each row execute function public.tg_set_updated_at_operational_workflows();
