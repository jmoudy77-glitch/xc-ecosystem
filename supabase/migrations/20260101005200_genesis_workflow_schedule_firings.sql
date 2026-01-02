create table if not exists public.operational_workflow_schedule_firings (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.operational_workflow_schedules(id) on delete cascade,
  program_id uuid not null,
  workflow_id uuid not null references public.operational_workflows(id) on delete cascade,
  due_at timestamptz not null,
  status text not null default 'queued' check (status in ('queued','started','failed')),
  run_id uuid references public.operational_workflow_runs(id) on delete set null,
  error text,
  created_at timestamptz not null default now()
);

create unique index if not exists workflow_schedule_firings_unique_due_idx
  on public.operational_workflow_schedule_firings (schedule_id, due_at);

create index if not exists workflow_schedule_firings_program_id_idx
  on public.operational_workflow_schedule_firings (program_id);

create index if not exists workflow_schedule_firings_workflow_id_idx
  on public.operational_workflow_schedule_firings (workflow_id);

create index if not exists workflow_schedule_firings_status_idx
  on public.operational_workflow_schedule_firings (status);

create or replace function public.ops_fire_workflow_schedule(
  p_schedule_id uuid,
  p_due_at timestamptz,
  p_firing_idempotency_key text default null
)
returns jsonb
language plpgsql
as $$
declare
  s public.operational_workflow_schedules;
  w public.operational_workflows;
  firing public.operational_workflow_schedule_firings;
  start_res record;
  run_idem text;
  enqueue_idem text;
begin
  select * into s
  from public.operational_workflow_schedules
  where id = p_schedule_id;

  if not found then
    return jsonb_build_object('error','schedule_not_found');
  end if;

  if s.is_enabled is distinct from true then
    return jsonb_build_object('error','schedule_disabled');
  end if;

  select * into w
  from public.operational_workflows
  where id = s.workflow_id;

  if not found then
    return jsonb_build_object('error','workflow_not_found');
  end if;

  if w.status <> 'active' then
    return jsonb_build_object('error','workflow_not_active');
  end if;

  insert into public.operational_workflow_schedule_firings (
    schedule_id, program_id, workflow_id, due_at, status
  )
  values (
    s.id, s.program_id, s.workflow_id, p_due_at, 'queued'
  )
  on conflict (schedule_id, due_at)
  do update set schedule_id = excluded.schedule_id
  returning * into firing;

  run_idem := coalesce(p_firing_idempotency_key, encode(gen_random_bytes(16), 'hex'));
  enqueue_idem := run_idem || ':enqueue';

  begin
    select * into start_res
    from public.ops_start_workflow_run(s.workflow_id, s.program_id, run_idem, enqueue_idem)
    limit 1;

    update public.operational_workflow_schedule_firings
    set status = 'started',
        run_id = start_res.run_id,
        error = null
    where id = firing.id;

    update public.operational_workflow_schedules
    set last_run_at = now()
    where id = s.id;

    return jsonb_build_object(
      'firing_id', firing.id,
      'status', 'started',
      'run', start_res
    );
  exception when others then
    update public.operational_workflow_schedule_firings
    set status = 'failed',
        error = sqlerrm
    where id = firing.id;

    return jsonb_build_object(
      'firing_id', firing.id,
      'status', 'failed',
      'error', sqlerrm
    );
  end;
end;
$$;
