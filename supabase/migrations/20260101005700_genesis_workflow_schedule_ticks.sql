create table if not exists public.operational_workflow_schedule_ticks (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.operational_workflow_schedules(id) on delete cascade,
  ticked_at timestamptz not null default now(),
  due_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists workflow_schedule_ticks_schedule_id_idx
  on public.operational_workflow_schedule_ticks (schedule_id);

create index if not exists workflow_schedule_ticks_ticked_at_idx
  on public.operational_workflow_schedule_ticks (ticked_at);

create unique index if not exists workflow_schedule_ticks_unique_due_idx
  on public.operational_workflow_schedule_ticks (schedule_id, due_at)
  where due_at is not null;

create or replace function public.ops_register_schedule_tick(
  p_schedule_id uuid,
  p_due_at timestamptz default null,
  p_meta jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  t public.operational_workflow_schedule_ticks;
begin
  insert into public.operational_workflow_schedule_ticks (schedule_id, ticked_at, due_at, meta)
  values (p_schedule_id, now(), p_due_at, coalesce(p_meta, '{}'::jsonb))
  on conflict (schedule_id, due_at)
  where p_due_at is not null
  do update set meta = excluded.meta
  returning * into t;

  return jsonb_build_object('tick', to_jsonb(t));
end;
$$;
