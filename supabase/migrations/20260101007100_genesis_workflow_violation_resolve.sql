create or replace function public.ops_workflow_violation_resolve(
  p_program_id uuid,
  p_violation_id uuid,
  p_status text default 'resolved'
)
returns jsonb
language plpgsql
as $$
declare
  v_now timestamptz := now();
  v_status text := coalesce(nullif(p_status, ''), 'resolved');
  updated_rows integer := 0;
  row_json jsonb;
begin
  if v_status not in ('resolved','dismissed') then
    raise exception 'invalid_status';
  end if;

  update public.operational_workflow_violation_registry v
     set status = v_status,
         resolved_at = v_now
   where v.id = p_violation_id
     and v.program_id = p_program_id
     and v.status = 'open';
  get diagnostics updated_rows = row_count;

  select to_jsonb(v.*)
    into row_json
    from public.operational_workflow_violation_registry v
   where v.id = p_violation_id
     and v.program_id = p_program_id;

  return jsonb_build_object(
    'program_id', p_program_id,
    'violation_id', p_violation_id,
    'status', v_status,
    'updated', (updated_rows = 1),
    'resolved_at', v_now,
    'violation', coalesce(row_json, '{}'::jsonb)
  );
end;
$$;
