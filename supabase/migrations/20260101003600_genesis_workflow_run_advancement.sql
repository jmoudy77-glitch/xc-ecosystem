create or replace function public.ops_seed_run_steps(p_run_id uuid)
returns integer
language plpgsql
as $$
declare
  v_workflow_id uuid;
  v_inserted integer := 0;
begin
  select r.workflow_id into v_workflow_id
  from public.operational_workflow_runs r
  where r.id = p_run_id;

  if not found then
    return 0;
  end if;

  insert into public.operational_workflow_run_steps (run_id, workflow_step_id, step_order, status, output)
  select
    p_run_id,
    s.id,
    s.step_order,
    'pending',
    '{}'::jsonb
  from public.operational_workflow_steps s
  where s.workflow_id = v_workflow_id
  order by s.step_order asc
  on conflict (run_id, step_order) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

create or replace function public.ops_advance_workflow_run(p_run_id uuid)
returns table (
  run_id uuid,
  run_status text,
  next_run_step_id uuid,
  next_action_key text,
  next_input jsonb
)
language plpgsql
as $$
declare
  r public.operational_workflow_runs;
  next_step public.operational_workflow_run_steps;
  next_action text;
  seeded integer;
begin
  select * into r
  from public.operational_workflow_runs
  where id = p_run_id
  for update;

  if not found then
    return;
  end if;

  if r.status in ('completed','failed') then
    return query select r.id, r.status, null::uuid, null::text, null::jsonb;
    return;
  end if;

  seeded := public.ops_seed_run_steps(p_run_id);

  update public.operational_workflow_runs
  set status = case when status = 'pending' then 'running' else status end,
      started_at = coalesce(started_at, now())
  where id = p_run_id;

  select rs.* into next_step
  from public.operational_workflow_run_steps rs
  where rs.run_id = p_run_id
    and rs.status = 'pending'
  order by rs.step_order asc
  limit 1
  for update skip locked;

  if not found then
    update public.operational_workflow_runs
    set status = 'completed',
        completed_at = now()
    where id = p_run_id
    returning * into r;

    return query select r.id, r.status, null::uuid, null::text, null::jsonb;
    return;
  end if;

  update public.operational_workflow_run_steps
  set status = 'running',
      started_at = coalesce(started_at, now())
  where id = next_step.id
  returning * into next_step;

  select s.action_key into next_action
  from public.operational_workflow_steps s
  where s.id = next_step.workflow_step_id;

  insert into public.operational_workflow_run_step_transitions (run_step_id, from_status, to_status, message, meta)
  values (
    next_step.id,
    'pending',
    'running',
    'run_step_started',
    jsonb_build_object('run_id', p_run_id, 'step_order', next_step.step_order)
  );

  return query
  select p_run_id, 'running'::text, next_step.id, next_action, '{}'::jsonb;
end;
$$;
