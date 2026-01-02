create or replace function public.ops_workflow_schedule_metrics(p_program_id uuid, p_days integer default 30)
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
    'by_schedule', coalesce((
      select jsonb_agg(x order by (x->>'schedule_id') asc)
      from (
        select jsonb_build_object(
          'schedule_id', s.id,
          'workflow_id', s.workflow_id,
          'enabled', coalesce(s.enabled, true),
          'status', coalesce(s.status, 'active'),
          'firings_total', count(f.*),
          'firings_completed', count(*) filter (where f.status = 'completed'),
          'firings_failed', count(*) filter (where f.status = 'failed'),
          'firings_running', count(*) filter (where f.status = 'running'),
          'firings_pending', count(*) filter (where f.status = 'pending'),
          'last_firing_at', max(f.created_at),
          'avg_lag_ms', avg(extract(epoch from (f.started_at - f.scheduled_for)) * 1000.0)
        ) as x
        from public.operational_workflow_schedules s
        left join public.operational_workflow_schedule_firings f
          on f.schedule_id = s.id
         and f.created_at >= now() - make_interval(days => v_days)
        where s.program_id = p_program_id
        group by s.id, s.workflow_id, s.enabled, s.status
      ) t
    ), '[]'::jsonb),
    'totals', jsonb_build_object(
      'firings_total', (
        select count(*)
        from public.operational_workflow_schedule_firings f
        where f.program_id = p_program_id
          and f.created_at >= now() - make_interval(days => v_days)
      ),
      'firings_completed', (
        select count(*)
        from public.operational_workflow_schedule_firings f
        where f.program_id = p_program_id
          and f.status = 'completed'
          and f.created_at >= now() - make_interval(days => v_days)
      ),
      'firings_failed', (
        select count(*)
        from public.operational_workflow_schedule_firings f
        where f.program_id = p_program_id
          and f.status = 'failed'
          and f.created_at >= now() - make_interval(days => v_days)
      ),
      'firings_running', (
        select count(*)
        from public.operational_workflow_schedule_firings f
        where f.program_id = p_program_id
          and f.status = 'running'
          and f.created_at >= now() - make_interval(days => v_days)
      ),
      'firings_pending', (
        select count(*)
        from public.operational_workflow_schedule_firings f
        where f.program_id = p_program_id
          and f.status = 'pending'
          and f.created_at >= now() - make_interval(days => v_days)
      ),
      'avg_lag_ms', (
        select avg(extract(epoch from (f.started_at - f.scheduled_for)) * 1000.0)
        from public.operational_workflow_schedule_firings f
        where f.program_id = p_program_id
          and f.created_at >= now() - make_interval(days => v_days)
      )
    )
  )
  into j;

  return j;
end;
$$;
