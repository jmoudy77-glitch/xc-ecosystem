create table if not exists public.operational_workflow_actions (
  key text primary key,
  version text not null default 'v1',
  description text,
  schema jsonb not null default '{}'::jsonb,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workflow_actions_enabled_idx
  on public.operational_workflow_actions (is_enabled);

create or replace function public.tg_set_updated_at_workflow_actions()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_on_workflow_actions on public.operational_workflow_actions;
create trigger set_updated_at_on_workflow_actions
before update on public.operational_workflow_actions
for each row execute function public.tg_set_updated_at_workflow_actions();
