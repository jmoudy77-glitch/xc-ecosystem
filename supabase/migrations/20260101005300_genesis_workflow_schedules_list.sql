create or replace function public.ops_list_workflow_schedules(p_program_id uuid)
returns jsonb
language plpgsql
as $$
declare
  j jsonb;
begin
  select jsonb_build_object(
    'schedules',
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'schedule', to_jsonb(s),
          'workflow', to_jsonb(w)
        )
        order by s.created_at desc
      ),
      '[]'::jsonb
    )
  )
  into j
  from public.operational_workflow_schedules s
  join public.operational_workflows w
    on w.id = s.workflow_id
  where s.program_id = p_program_id;

  return j;
end;
$$;

create or replace function public.ops_list_workflow_schedule_firings(p_program_id uuid, p_limit integer default 50)
returns jsonb
language plpgsql
as $$
declare
  j jsonb;
begin
  select jsonb_build_object(
    'firings',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'firing', to_jsonb(f),
          'schedule', to_jsonb(s),
          'workflow', to_jsonb(w)
        )
        order by f.due_at desc, f.created_at desc
      )
      from public.operational_workflow_schedule_firings f
      join public.operational_workflow_schedules s
        on s.id = f.schedule_id
      join public.operational_workflows w
        on w.id = f.workflow_id
      where f.program_id = p_program_id
      limit greatest(1, least(coalesce(p_limit, 50), 200))
    ), '[]'::jsonb)
  )
  into j;

  return j;
end;
$$;
