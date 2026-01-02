create or replace function public.ops_workflow_health_summary(p_program_id uuid, p_days integer default 30)
returns jsonb
language plpgsql
as $$
declare
  v_days integer;
  j_runs jsonb;
  j_actions jsonb;
  j_schedules jsonb;
  j_steps jsonb;
  j_violations jsonb;
begin
  v_days := greatest(1, least(coalesce(p_days, 30), 365));

  select public.ops_workflow_runs_summary(p_program_id, v_days) into j_runs;
  select public.ops_workflow_action_metrics(p_program_id, v_days) into j_actions;
  select public.ops_workflow_schedule_metrics(p_program_id, v_days) into j_schedules;
  select public.ops_workflow_step_metrics(p_program_id, v_days) into j_steps;
  select public.ops_workflow_violation_metrics(p_program_id, v_days) into j_violations;

  return jsonb_build_object(
    'program_id', p_program_id,
    'window_days', v_days,
    'runs', coalesce(j_runs, '{}'::jsonb),
    'actions', coalesce(j_actions, '{}'::jsonb),
    'schedules', coalesce(j_schedules, '{}'::jsonb),
    'steps', coalesce(j_steps, '{}'::jsonb),
    'violations', coalesce(j_violations, '{}'::jsonb)
  );
end;
$$;
