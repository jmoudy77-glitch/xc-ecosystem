create or replace function public.ops_workflow_runs_summary(p_program_id uuid, p_days integer default 30)
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
    'by_workflow', coalesce((
      select jsonb_agg(x order by (x->>'workflow_name') asc)
      from (
        select jsonb_build_object(
          'workflow_id', w.id,
          'workflow_name', w.name,
          'status', w.status,
          'runs_total', count(r.*),
          'runs_completed', count(*) filter (where r.status = 'completed'),
          'runs_failed', count(*) filter (where r.status = 'failed'),
          'runs_running', count(*) filter (where r.status = 'running'),
          'runs_pending', count(*) filter (where r.status = 'pending'),
          'last_run_at', max(r.created_at)
        ) as x
        from public.operational_workflows w
        left join public.operational_workflow_runs r
          on r.workflow_id = w.id
         and r.program_id = p_program_id
         and r.created_at >= now() - make_interval(days => v_days)
        where w.program_id = p_program_id
        group by w.id, w.name, w.status
      ) t
    ), '[]'::jsonb),
    'totals', jsonb_build_object(
      'runs_total', (
        select count(*) from public.operational_workflow_runs r
        where r.program_id = p_program_id
          and r.created_at >= now() - make_interval(days => v_days)
      ),
      'runs_completed', (
        select count(*) from public.operational_workflow_runs r
        where r.program_id = p_program_id
          and r.status = 'completed'
          and r.created_at >= now() - make_interval(days => v_days)
      ),
      'runs_failed', (
        select count(*) from public.operational_workflow_runs r
        where r.program_id = p_program_id
          and r.status = 'failed'
          and r.created_at >= now() - make_interval(days => v_days)
      ),
      'runs_running', (
        select count(*) from public.operational_workflow_runs r
        where r.program_id = p_program_id
          and r.status = 'running'
          and r.created_at >= now() - make_interval(days => v_days)
      ),
      'runs_pending', (
        select count(*) from public.operational_workflow_runs r
        where r.program_id = p_program_id
          and r.status = 'pending'
          and r.created_at >= now() - make_interval(days => v_days)
      )
    )
  )
  into j;

  return j;
end;
$$;
