create or replace function public.ops_schedule_tick_feed(p_limit integer default 100)
returns jsonb
language plpgsql
as $$
declare
  j jsonb;
begin
  select jsonb_build_object(
    'schedules',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'schedule', to_jsonb(s),
          'workflow', to_jsonb(w)
        )
        order by coalesce(s.updated_at, s.created_at) desc
      )
      from public.operational_workflow_schedules s
      join public.operational_workflows w
        on w.id = s.workflow_id
      where s.is_enabled = true
        and w.status = 'active'
      limit greatest(1, least(coalesce(p_limit, 100), 500))
    ), '[]'::jsonb)
  )
  into j;

  return j;
end;
$$;
