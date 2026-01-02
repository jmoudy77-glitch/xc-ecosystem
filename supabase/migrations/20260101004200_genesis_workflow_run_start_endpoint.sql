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
  r record;
  q record;
begin
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
