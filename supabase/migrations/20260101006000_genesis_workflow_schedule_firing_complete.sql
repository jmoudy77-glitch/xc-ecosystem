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
