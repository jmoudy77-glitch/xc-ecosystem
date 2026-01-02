create or replace function public.ops_cancel_workflow_run(p_run_id uuid, p_reason text default 'cancelled')
returns table (run_id uuid, status text)
language plpgsql
as $$
declare
  r public.operational_workflow_runs;
begin
  select * into r
  from public.operational_workflow_runs
  where id = p_run_id
  for update;

  if not found then
    raise exception 'run_not_found' using errcode = 'P0001';
  end if;

  if r.status in ('completed','failed') then
    return query select r.id, r.status;
    return;
  end if;

  update public.operational_workflow_invocations i
  set status = 'failed',
      completed_at = now(),
      error = coalesce(p_reason, 'cancelled')
  from public.operational_workflow_run_steps rs
  where rs.run_id = p_run_id
    and i.run_step_id = rs.id
    and i.status in ('queued','running');

  update public.operational_workflow_run_steps rs
  set status = 'failed',
      completed_at = coalesce(rs.completed_at, now()),
      output = jsonb_build_object('cancelled', true, 'reason', coalesce(p_reason,'cancelled'))
  where rs.run_id = p_run_id
    and rs.status not in ('completed','failed');

  insert into public.operational_workflow_run_step_transitions (run_step_id, from_status, to_status, message, meta)
  select
    rs.id,
    rs.status,
    'failed',
    'run_cancelled',
    jsonb_build_object('run_id', p_run_id, 'reason', coalesce(p_reason,'cancelled'))
  from public.operational_workflow_run_steps rs
  where rs.run_id = p_run_id
    and rs.status not in ('completed','failed');

  update public.operational_workflow_runs
  set status = 'failed',
      completed_at = now(),
      result = jsonb_build_object('cancelled', true, 'reason', coalesce(p_reason,'cancelled'))
  where id = p_run_id
  returning * into r;

  return query select r.id, r.status;
end;
$$;
