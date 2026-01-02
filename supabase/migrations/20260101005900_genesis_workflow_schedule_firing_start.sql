create or replace function public.ops_start_schedule_firing(p_firing_id uuid, p_idempotency_key text default null)
returns jsonb
language plpgsql
as $$
declare
  f public.operational_workflow_schedule_firings;
  s public.operational_workflow_schedules;
  run_idem text;
  enqueue_idem text;
  start_res record;
begin
  select * into f
  from public.operational_workflow_schedule_firings
  where id = p_firing_id
  for update;

  if not found then
    return jsonb_build_object('error','firing_not_found');
  end if;

  if f.status <> 'started' then
    return jsonb_build_object('error','firing_not_started');
  end if;

  select * into s
  from public.operational_workflow_schedules
  where id = f.schedule_id;

  if not found then
    return jsonb_build_object('error','schedule_not_found');
  end if;

  run_idem := coalesce(p_idempotency_key, encode(gen_random_bytes(16), 'hex'));
  enqueue_idem := run_idem || ':enqueue';

  begin
    select * into start_res
    from public.ops_start_workflow_run(f.workflow_id, f.program_id, run_idem, enqueue_idem)
    limit 1;

    update public.operational_workflow_schedule_firings
    set run_id = start_res.run_id,
        error = null
    where id = f.id;

    update public.operational_workflow_schedules
    set last_run_at = now()
    where id = s.id;

    return jsonb_build_object('ok', true, 'firing_id', f.id, 'run', start_res);
  exception when others then
    update public.operational_workflow_schedule_firings
    set status = 'failed',
        error = sqlerrm
    where id = f.id;

    return jsonb_build_object('error','start_failed','detail',sqlerrm,'firing_id',f.id);
  end;
end;
$$;
