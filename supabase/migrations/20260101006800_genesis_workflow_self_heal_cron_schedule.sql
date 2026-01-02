create or replace function public.ops_workflow_self_heal_cron()
returns jsonb
language plpgsql
as $$
declare
  v_now timestamptz := now();
  v_count integer := 0;
  v_total_healed jsonb := '{}'::jsonb;
  r record;
  j jsonb;
  healed_sum integer := 0;
begin
  for r in
    select distinct program_id
    from public.operational_workflow_runs
  loop
    select public.ops_workflow_self_heal_full(r.program_id, 15) into j;

    v_total_healed := jsonb_set(
      v_total_healed,
      array[r.program_id::text],
      j->'healed',
      true
    );

    healed_sum := healed_sum
      + coalesce((j->'healed'->>'runs')::int, 0)
      + coalesce((j->'healed'->>'run_steps')::int, 0)
      + coalesce((j->'healed'->>'invocations')::int, 0)
      + coalesce((j->'healed'->>'firings')::int, 0);

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object(
    'executed_at', v_now,
    'programs_processed', v_count,
    'healed_total', healed_sum,
    'by_program', v_total_healed
  );
end;
$$;
