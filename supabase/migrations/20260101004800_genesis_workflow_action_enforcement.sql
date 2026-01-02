create or replace function public.ops_enqueue_workflow_invocation(
  p_run_step_id uuid,
  p_action_key text,
  p_input jsonb default '{}'::jsonb,
  p_idempotency_key text default null
)
returns table (id uuid, status text)
language plpgsql
as $$
declare
  v_enabled boolean;
begin
  select a.is_enabled into v_enabled
  from public.operational_workflow_actions a
  where a.key = lower(p_action_key);

  if v_enabled is distinct from true then
    raise exception 'action_disabled' using errcode = 'P0001';
  end if;

  if p_idempotency_key is not null then
    return query
    insert into public.operational_workflow_invocations (run_step_id, action_key, status, input, output, idempotency_key)
    values (p_run_step_id, lower(p_action_key), 'queued', coalesce(p_input, '{}'::jsonb), '{}'::jsonb, p_idempotency_key)
    on conflict (run_step_id, idempotency_key)
    do update set idempotency_key = excluded.idempotency_key
    returning operational_workflow_invocations.id, operational_workflow_invocations.status;
  else
    return query
    insert into public.operational_workflow_invocations (run_step_id, action_key, status, input, output)
    values (p_run_step_id, lower(p_action_key), 'queued', coalesce(p_input, '{}'::jsonb), '{}'::jsonb)
    returning operational_workflow_invocations.id, operational_workflow_invocations.status;
  end if;
end;
$$;
