create or replace function public.ops_workflow_violation_metrics(p_program_id uuid, p_days integer default 30)
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
    'open', jsonb_build_object(
      'total', (
        select count(*) from public.operational_workflow_violation_registry v
        where v.program_id = p_program_id
          and v.status = 'open'
      ),
      'by_type', coalesce((
        select jsonb_agg(x order by (x->>'violation_type') asc)
        from (
          select jsonb_build_object(
            'violation_type', v.violation_type,
            'count', count(*),
            'oldest_detected_at', min(v.detected_at),
            'newest_detected_at', max(v.detected_at)
          ) as x
          from public.operational_workflow_violation_registry v
          where v.program_id = p_program_id
            and v.status = 'open'
          group by v.violation_type
        ) t
      ), '[]'::jsonb),
      'by_severity', coalesce((
        select jsonb_agg(x order by (x->>'severity') asc)
        from (
          select jsonb_build_object(
            'severity', v.severity,
            'count', count(*),
            'oldest_detected_at', min(v.detected_at),
            'newest_detected_at', max(v.detected_at)
          ) as x
          from public.operational_workflow_violation_registry v
          where v.program_id = p_program_id
            and v.status = 'open'
          group by v.severity
        ) t
      ), '[]'::jsonb)
    ),
    'window', jsonb_build_object(
      'detected_total', (
        select count(*) from public.operational_workflow_violation_registry v
        where v.program_id = p_program_id
          and v.detected_at >= now() - make_interval(days => v_days)
      ),
      'resolved_total', (
        select count(*) from public.operational_workflow_violation_registry v
        where v.program_id = p_program_id
          and v.status = 'resolved'
          and v.resolved_at is not null
          and v.resolved_at >= now() - make_interval(days => v_days)
      ),
      'dismissed_total', (
        select count(*) from public.operational_workflow_violation_registry v
        where v.program_id = p_program_id
          and v.status = 'dismissed'
          and v.resolved_at is not null
          and v.resolved_at >= now() - make_interval(days => v_days)
      ),
      'by_type', coalesce((
        select jsonb_agg(x order by (x->>'violation_type') asc)
        from (
          select jsonb_build_object(
            'violation_type', v.violation_type,
            'detected', count(*),
            'resolved', count(*) filter (where v.status = 'resolved'),
            'dismissed', count(*) filter (where v.status = 'dismissed'),
            'open', count(*) filter (where v.status = 'open')
          ) as x
          from public.operational_workflow_violation_registry v
          where v.program_id = p_program_id
            and v.detected_at >= now() - make_interval(days => v_days)
          group by v.violation_type
        ) t
      ), '[]'::jsonb),
      'by_severity', coalesce((
        select jsonb_agg(x order by (x->>'severity') asc)
        from (
          select jsonb_build_object(
            'severity', v.severity,
            'detected', count(*),
            'resolved', count(*) filter (where v.status = 'resolved'),
            'dismissed', count(*) filter (where v.status = 'dismissed'),
            'open', count(*) filter (where v.status = 'open')
          ) as x
          from public.operational_workflow_violation_registry v
          where v.program_id = p_program_id
            and v.detected_at >= now() - make_interval(days => v_days)
          group by v.severity
        ) t
      ), '[]'::jsonb)
    )
  )
  into j;

  return j;
end;
$$;
