create or replace function public.ops_workflow_step_metrics(p_program_id uuid, p_days integer default 30)
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
    'by_step', coalesce((
      select jsonb_agg(x order by (x->>'workflow_id') asc, (x->>'step_name') asc)
      from (
        select jsonb_build_object(
          'workflow_id', w.id,
          'workflow_name', w.name,
          'step_id', s.id,
          'step_name', s.name,
          'run_steps_total', count(rs.*),
          'run_steps_completed', count(*) filter (where rs.status = 'completed'),
          'run_steps_failed', count(*) filter (where rs.status = 'failed'),
          'run_steps_running', count(*) filter (where rs.status = 'running'),
          'run_steps_pending', count(*) filter (where rs.status = 'pending'),
          'avg_duration_ms', avg(extract(epoch from (rs.completed_at - rs.created_at)) * 1000.0),
          'last_seen_at', max(rs.created_at)
        ) as x
        from public.operational_workflow_run_steps rs
        join public.operational_workflow_runs r
          on r.id = rs.run_id
        join public.operational_workflows w
          on w.id = r.workflow_id
        join public.operational_workflow_steps s
          on s.id = rs.workflow_step_id
        where r.program_id = p_program_id
          and rs.created_at >= now() - make_interval(days => v_days)
        group by w.id, w.name, s.id, s.name
      ) t
    ), '[]'::jsonb),
    'totals', jsonb_build_object(
      'run_steps_total', (
        select count(*)
        from public.operational_workflow_run_steps rs
        join public.operational_workflow_runs r on r.id = rs.run_id
        where r.program_id = p_program_id
          and rs.created_at >= now() - make_interval(days => v_days)
      ),
      'run_steps_completed', (
        select count(*)
        from public.operational_workflow_run_steps rs
        join public.operational_workflow_runs r on r.id = rs.run_id
        where r.program_id = p_program_id
          and rs.status = 'completed'
          and rs.created_at >= now() - make_interval(days => v_days)
      ),
      'run_steps_failed', (
        select count(*)
        from public.operational_workflow_run_steps rs
        join public.operational_workflow_runs r on r.id = rs.run_id
        where r.program_id = p_program_id
          and rs.status = 'failed'
          and rs.created_at >= now() - make_interval(days => v_days)
      ),
      'run_steps_running', (
        select count(*)
        from public.operational_workflow_run_steps rs
        join public.operational_workflow_runs r on r.id = rs.run_id
        where r.program_id = p_program_id
          and rs.status = 'running'
          and rs.created_at >= now() - make_interval(days => v_days)
      ),
      'run_steps_pending', (
        select count(*)
        from public.operational_workflow_run_steps rs
        join public.operational_workflow_runs r on r.id = rs.run_id
        where r.program_id = p_program_id
          and rs.status = 'pending'
          and rs.created_at >= now() - make_interval(days => v_days)
      ),
      'avg_duration_ms', (
        select avg(extract(epoch from (rs.completed_at - rs.created_at)) * 1000.0)
        from public.operational_workflow_run_steps rs
        join public.operational_workflow_runs r on r.id = rs.run_id
        where r.program_id = p_program_id
          and rs.created_at >= now() - make_interval(days => v_days)
      )
    )
  )
  into j;

  return j;
end;
$$;
