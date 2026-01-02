create or replace function public.ops_workflow_command_ingress(
  p_program_id uuid,
  p_command text,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_cmd text := lower(coalesce(nullif(p_command,''), ''));
  v_now timestamptz := now();
  v_run_id uuid;
  v_schedule_id uuid;
  v_firing_id uuid;
  v_workflow_id uuid;
begin
  if v_cmd = 'start_workflow' then
    v_workflow_id := (p_payload->>'workflow_id')::uuid;
    if v_workflow_id is null then
      raise exception 'missing_workflow_id';
    end if;

    insert into public.operational_workflow_runs(program_id, workflow_id, status, created_at, updated_at)
    values (p_program_id, v_workflow_id, 'pending', v_now, v_now)
    returning id into v_run_id;

    return jsonb_build_object(
      'program_id', p_program_id,
      'command', v_cmd,
      'created_at', v_now,
      'run_id', v_run_id
    );

  elsif v_cmd = 'cancel_run' then
    v_run_id := (p_payload->>'run_id')::uuid;
    if v_run_id is null then
      raise exception 'missing_run_id';
    end if;

    update public.operational_workflow_runs r
       set status = 'cancelled',
           updated_at = v_now
     where r.id = v_run_id
       and r.program_id = p_program_id
       and r.status not in ('completed','failed','cancelled');

    return jsonb_build_object(
      'program_id', p_program_id,
      'command', v_cmd,
      'updated_at', v_now,
      'run_id', v_run_id
    );

  elsif v_cmd = 'enable_schedule' then
    v_schedule_id := (p_payload->>'schedule_id')::uuid;
    if v_schedule_id is null then
      raise exception 'missing_schedule_id';
    end if;

    update public.operational_workflow_schedules s
       set enabled = true,
           updated_at = v_now
     where s.id = v_schedule_id
       and s.program_id = p_program_id;

    return jsonb_build_object(
      'program_id', p_program_id,
      'command', v_cmd,
      'updated_at', v_now,
      'schedule_id', v_schedule_id
    );

  elsif v_cmd = 'disable_schedule' then
    v_schedule_id := (p_payload->>'schedule_id')::uuid;
    if v_schedule_id is null then
      raise exception 'missing_schedule_id';
    end if;

    update public.operational_workflow_schedules s
       set enabled = false,
           updated_at = v_now
     where s.id = v_schedule_id
       and s.program_id = p_program_id;

    return jsonb_build_object(
      'program_id', p_program_id,
      'command', v_cmd,
      'updated_at', v_now,
      'schedule_id', v_schedule_id
    );

  elsif v_cmd = 'fire_schedule' then
    v_schedule_id := (p_payload->>'schedule_id')::uuid;
    if v_schedule_id is null then
      raise exception 'missing_schedule_id';
    end if;

    insert into public.operational_workflow_schedule_firings(program_id, schedule_id, status, created_at, scheduled_for, updated_at)
    values (p_program_id, v_schedule_id, 'pending', v_now, v_now, v_now)
    returning id into v_firing_id;

    return jsonb_build_object(
      'program_id', p_program_id,
      'command', v_cmd,
      'created_at', v_now,
      'firing_id', v_firing_id,
      'schedule_id', v_schedule_id
    );

  else
    raise exception 'invalid_command';
  end if;
end;
$$;
