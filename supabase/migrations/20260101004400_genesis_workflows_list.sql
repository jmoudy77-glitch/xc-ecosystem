create or replace function public.ops_list_operational_workflows(p_program_id uuid)
returns jsonb
language plpgsql
as $$
declare
  j jsonb;
begin
  select jsonb_build_object(
    'workflows', coalesce(jsonb_agg(to_jsonb(w) order by w.created_at desc), '[]'::jsonb)
  )
  into j
  from public.operational_workflows w
  where w.program_id = p_program_id;

  return j;
end;
$$;
