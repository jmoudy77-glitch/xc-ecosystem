create or replace function public.ops_workflow_public_read_gateway(
  p_program_id uuid,
  p_kind text,
  p_days integer default 30
)
returns jsonb
language plpgsql
as $$
declare
  v_kind text := lower(coalesce(nullif(p_kind,''), 'health'));
  v_days integer := greatest(1, least(coalesce(p_days, 30), 365));
begin
  if v_kind = 'health' then
    return public.ops_workflow_health_summary(p_program_id, v_days);
  elsif v_kind = 'runs' then
    return public.ops_workflow_runs_summary(p_program_id, v_days);
  elsif v_kind = 'actions' then
    return public.ops_workflow_action_metrics(p_program_id, v_days);
  elsif v_kind = 'schedules' then
    return public.ops_workflow_schedule_metrics(p_program_id, v_days);
  elsif v_kind = 'steps' then
    return public.ops_workflow_step_metrics(p_program_id, v_days);
  elsif v_kind = 'violations' then
    return public.ops_workflow_violation_metrics(p_program_id, v_days);
  else
    raise exception 'invalid_kind';
  end if;
end;
$$;
