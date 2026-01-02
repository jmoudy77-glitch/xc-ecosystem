create or replace function public.ops_update_workflow_schedule(
  p_schedule_id uuid,
  p_name text default null,
  p_cron text default null,
  p_timezone text default null,
  p_is_enabled boolean default null,
  p_spec jsonb default null
)
returns public.operational_workflow_schedules
language plpgsql
as $$
declare
  s public.operational_workflow_schedules;
begin
  update public.operational_workflow_schedules
  set name = coalesce(p_name, name),
      cron = coalesce(p_cron, cron),
      timezone = coalesce(p_timezone, timezone),
      is_enabled = coalesce(p_is_enabled, is_enabled),
      spec = coalesce(p_spec, spec)
  where id = p_schedule_id
  returning * into s;

  if not found then
    raise exception 'schedule_not_found' using errcode = 'P0001';
  end if;

  return s;
end;
$$;
