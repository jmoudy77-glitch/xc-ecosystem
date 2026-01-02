create or replace function public.ops_workflow_violation_detect_cron()
returns jsonb
language plpgsql
as $$
declare
  v_now timestamptz := now();
  v_count integer := 0;
  v_total_inserted integer := 0;
  r record;
  j jsonb;
begin
  for r in
    select distinct program_id
    from public.operational_workflow_runs
  loop
    select public.ops_workflow_violation_detect(r.program_id, 15) into j;

    v_total_inserted := v_total_inserted + coalesce((j->>'inserted_total')::int, 0);
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object(
    'executed_at', v_now,
    'programs_processed', v_count,
    'inserted_total', v_total_inserted
  );
end;
$$;
