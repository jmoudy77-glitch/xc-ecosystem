create or replace function public.ops_list_workflow_invocations(p_run_id uuid)
returns jsonb
language plpgsql
as $$
declare
  j jsonb;
begin
  select jsonb_build_object(
    'invocations',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'invocation', to_jsonb(i),
          'run_step', to_jsonb(rs)
        )
        order by rs.step_order asc, i.created_at asc
      )
      from public.operational_workflow_run_steps rs
      left join public.operational_workflow_invocations i
        on i.id = rs.invocation_id
      where rs.run_id = p_run_id
    ), '[]'::jsonb)
  )
  into j;

  return j;
end;
$$;
