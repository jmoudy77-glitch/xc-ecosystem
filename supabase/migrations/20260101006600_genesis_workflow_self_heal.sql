create or replace function public.ops_workflow_self_heal(p_program_id uuid)
returns jsonb
language plpgsql
as $$
declare
  v_now timestamptz := now();
  healed integer := 0;
begin
  update public.operational_workflow_runs r
     set status = 'pending',
         updated_at = v_now
   where r.program_id = p_program_id
     and r.status = 'running'
     and r.updated_at < v_now - interval '15 minutes';
  get diagnostics healed = row_count;

  return jsonb_build_object(
    'program_id', p_program_id,
    'healed_runs', healed,
    'executed_at', v_now
  );
end;
$$;
