create or replace function public.ops_get_workflow_run_detail(p_run_id uuid)
returns jsonb
language plpgsql
as $$
declare
  j jsonb;
begin
  select jsonb_build_object(
    'run', to_jsonb(r),
    'steps', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'run_step', to_jsonb(rs),
          'workflow_step', to_jsonb(ws),
          'invocation', to_jsonb(inv)
        )
        order by rs.step_order asc
      )
      from public.operational_workflow_run_steps rs
      join public.operational_workflow_steps ws
        on ws.id = rs.workflow_step_id
      left join public.operational_workflow_invocations inv
        on inv.id = rs.invocation_id
      where rs.run_id = r.id
    ), '[]'::jsonb)
  )
  into j
  from public.operational_workflow_runs r
  where r.id = p_run_id;

  if j is null then
    return jsonb_build_object('error','run_not_found');
  end if;

  return j;
end;
$$;
