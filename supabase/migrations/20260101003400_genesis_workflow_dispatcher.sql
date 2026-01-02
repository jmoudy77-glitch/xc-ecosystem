create or replace function public.ops_dispatch_next_workflow_invocation(p_limit integer default 1)
returns table (
  invocation_id uuid,
  run_step_id uuid,
  action_key text,
  input jsonb
)
language plpgsql
as $$
begin
  return query
  with picked as (
    select i.id, i.run_step_id, i.action_key, i.input
    from public.operational_workflow_invocations i
    where i.status = 'queued'
    order by i.created_at asc
    limit greatest(p_limit, 1)
    for update skip locked
  )
  update public.operational_workflow_invocations u
  set status = 'running',
      started_at = coalesce(started_at, now())
  from picked
  where u.id = picked.id
  returning u.id, u.run_step_id, u.action_key, u.input;
end;
$$;

create or replace function public.ops_complete_workflow_invocation(
  p_invocation_id uuid,
  p_success boolean,
  p_output jsonb default '{}'::jsonb,
  p_error text default null
)
returns public.operational_workflow_invocations
language plpgsql
as $$
declare
  r public.operational_workflow_invocations;
begin
  update public.operational_workflow_invocations
  set status = case when p_success then 'completed' else 'failed' end,
      completed_at = now(),
      output = coalesce(p_output, '{}'::jsonb),
      error = case when p_success then null else p_error end
  where id = p_invocation_id
  returning * into r;

  return r;
end;
$$;
