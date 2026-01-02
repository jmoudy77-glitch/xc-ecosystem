create or replace function public.ops_list_workflow_runs(p_program_id uuid, p_workflow_id uuid)
returns jsonb
language plpgsql
as $$
declare
  j jsonb;
begin
  select jsonb_build_object(
    'runs', coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc), '[]'::jsonb)
  )
  into j
  from public.operational_workflow_runs r
  where r.program_id = p_program_id
    and r.workflow_id = p_workflow_id;

  return j;
end;
$$;
