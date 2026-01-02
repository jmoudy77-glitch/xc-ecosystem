create or replace function public.ops_workflow_action_metrics(p_program_id uuid, p_days integer default 30)
returns jsonb
language plpgsql
as $$
declare
  v_days integer;
  j jsonb;
begin
  v_days := greatest(1, least(coalesce(p_days, 30), 365));

  select jsonb_build_object(
    'program_id', p_program_id,
    'window_days', v_days,
    'by_action', coalesce((
      select jsonb_agg(x order by (x->>'action_key') asc)
      from (
        select jsonb_build_object(
          'action_key', i.action_key,
          'invocations_total', count(i.*),
          'invocations_completed', count(*) filter (where i.status = 'completed'),
          'invocations_failed', count(*) filter (where i.status = 'failed'),
          'avg_duration_ms', avg(extract(epoch from (i.completed_at - i.created_at)) * 1000.0)
        ) as x
        from public.operational_workflow_invocations i
        join public.operational_workflow_runs r
          on r.id = (select rs.run_id from public.operational_workflow_run_steps rs where rs.id = i.run_step_id)
        where r.program_id = p_program_id
          and i.created_at >= now() - make_interval(days => v_days)
        group by i.action_key
      ) t
    ), '[]'::jsonb)
  )
  into j;

  return j;
end;
$$;
