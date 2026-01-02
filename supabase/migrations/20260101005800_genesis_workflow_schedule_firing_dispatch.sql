create or replace function public.ops_dispatch_next_schedule_firing(p_limit integer default 10)
returns table (
  firing_id uuid,
  schedule_id uuid,
  program_id uuid,
  workflow_id uuid,
  due_at timestamptz
)
language plpgsql
as $$
begin
  return query
  with picked as (
    select f.id, f.schedule_id, f.program_id, f.workflow_id, f.due_at
    from public.operational_workflow_schedule_firings f
    where f.status = 'queued'
    order by f.due_at asc, f.created_at asc
    limit greatest(1, least(coalesce(p_limit, 10), 100))
    for update skip locked
  )
  update public.operational_workflow_schedule_firings u
  set status = 'started'
  from picked
  where u.id = picked.id
  returning u.id, u.schedule_id, u.program_id, u.workflow_id, u.due_at;
end;
$$;

create or replace function public.ops_complete_schedule_firing(p_firing_id uuid, p_run_id uuid, p_error text default null)
returns jsonb
language plpgsql
as $$
declare
  f public.operational_workflow_schedule_firings;
begin
  update public.operational_workflow_schedule_firings
  set run_id = p_run_id,
      status = case when p_error is null then 'started' else 'failed' end,
      error = p_error
  where id = p_firing_id
  returning * into f;

  if not found then
    return jsonb_build_object('error','firing_not_found');
  end if;

  return jsonb_build_object('firing', to_jsonb(f));
end;
$$;
