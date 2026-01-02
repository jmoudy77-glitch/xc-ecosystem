create or replace function public.ops_set_workflow_status(p_workflow_id uuid, p_status text)
returns table (id uuid, status text)
language plpgsql
as $$
begin
  update public.operational_workflows
  set status = p_status
  where id = p_workflow_id
    and p_status in ('active','paused','archived')
  returning id, status;
end;
$$;

create or replace function public.ops_start_workflow_run(
  p_workflow_id uuid,
  p_program_id uuid,
  p_run_idempotency_key text default null,
  p_enqueue_idempotency_key text default null
)
returns table (
  run_id uuid,
  run_status text,
  run_step_id uuid,
  action_key text,
  invocation_id uuid,
  invocation_status text
)
language plpgsql
as $$
declare
  w public.operational_workflows;
  r record;
  q record;
begin
  select * into w
  from public.operational_workflows
  where id = p_workflow_id;

  if not found then
    raise exception 'workflow_not_found' using errcode = 'P0001';
  end if;

  if w.status <> 'active' then
    raise exception 'workflow_not_active' using errcode = 'P0001';
  end if;

  select * into r
  from public.ops_create_workflow_run(p_workflow_id, p_program_id, p_run_idempotency_key)
  limit 1;

  select * into q
  from public.ops_enqueue_next_invocation_for_run(r.id, p_enqueue_idempotency_key)
  limit 1;

  return query
  select q.run_id, q.run_status, q.run_step_id, q.action_key, q.invocation_id, q.invocation_status;
end;
$$;
