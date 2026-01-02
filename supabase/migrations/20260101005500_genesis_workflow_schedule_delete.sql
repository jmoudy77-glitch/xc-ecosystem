create or replace function public.ops_delete_workflow_schedule(p_schedule_id uuid)
returns jsonb
language plpgsql
as $$
declare
  s public.operational_workflow_schedules;
begin
  delete from public.operational_workflow_schedules
  where id = p_schedule_id
  returning * into s;

  if not found then
    return jsonb_build_object('error','schedule_not_found');
  end if;

  return jsonb_build_object('ok', true, 'deleted_id', s.id);
end;
$$;
