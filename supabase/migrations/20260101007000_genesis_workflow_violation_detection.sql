create unique index if not exists uq_op_wf_violation_open
on public.operational_workflow_violation_registry(program_id, entity_type, entity_id, violation_type)
where status = 'open';

create or replace function public.ops_workflow_violation_detect(
  p_program_id uuid,
  p_stale_minutes integer default 15
)
returns jsonb
language plpgsql
as $$
declare
  v_now timestamptz := now();
  v_minutes integer := greatest(1, least(coalesce(p_stale_minutes, 15), 1440));
  v_cutoff timestamptz := v_now - make_interval(mins => v_minutes);

  ins_runs integer := 0;
  ins_steps integer := 0;
  ins_invocations integer := 0;
  ins_firings integer := 0;
  ins_total integer := 0;

  has_runs_updated_at boolean := false;
  has_steps_updated_at boolean := false;
  has_inv_updated_at boolean := false;
  has_firings_updated_at boolean := false;
begin
  select exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='operational_workflow_runs' and column_name='updated_at'
  ) into has_runs_updated_at;

  select exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='operational_workflow_run_steps' and column_name='updated_at'
  ) into has_steps_updated_at;

  select exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='operational_workflow_invocations' and column_name='updated_at'
  ) into has_inv_updated_at;

  select exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='operational_workflow_schedule_firings' and column_name='updated_at'
  ) into has_firings_updated_at;

  if has_runs_updated_at then
    insert into public.operational_workflow_violation_registry(program_id, entity_type, entity_id, violation_type, severity, status, detected_at)
    select
      p_program_id,
      'run',
      r.id,
      'stale_running',
      'high',
      'open',
      v_now
    from public.operational_workflow_runs r
    where r.program_id = p_program_id
      and r.status = 'running'
      and r.updated_at < v_cutoff
    on conflict do nothing;
  else
    insert into public.operational_workflow_violation_registry(program_id, entity_type, entity_id, violation_type, severity, status, detected_at)
    select
      p_program_id,
      'run',
      r.id,
      'stale_running',
      'high',
      'open',
      v_now
    from public.operational_workflow_runs r
    where r.program_id = p_program_id
      and r.status = 'running'
      and r.created_at < v_cutoff
    on conflict do nothing;
  end if;
  get diagnostics ins_runs = row_count;

  if has_steps_updated_at then
    insert into public.operational_workflow_violation_registry(program_id, entity_type, entity_id, violation_type, severity, status, detected_at)
    select
      p_program_id,
      'run_step',
      rs.id,
      'stale_active',
      'medium',
      'open',
      v_now
    from public.operational_workflow_run_steps rs
    join public.operational_workflow_runs r on r.id = rs.run_id
    where r.program_id = p_program_id
      and rs.status in ('running','pending')
      and rs.updated_at < v_cutoff
    on conflict do nothing;
  else
    insert into public.operational_workflow_violation_registry(program_id, entity_type, entity_id, violation_type, severity, status, detected_at)
    select
      p_program_id,
      'run_step',
      rs.id,
      'stale_active',
      'medium',
      'open',
      v_now
    from public.operational_workflow_run_steps rs
    join public.operational_workflow_runs r on r.id = rs.run_id
    where r.program_id = p_program_id
      and rs.status in ('running','pending')
      and rs.created_at < v_cutoff
    on conflict do nothing;
  end if;
  get diagnostics ins_steps = row_count;

  if has_inv_updated_at then
    insert into public.operational_workflow_violation_registry(program_id, entity_type, entity_id, violation_type, severity, status, detected_at)
    select
      p_program_id,
      'invocation',
      i.id,
      'stale_running',
      'high',
      'open',
      v_now
    from public.operational_workflow_invocations i
    join public.operational_workflow_run_steps rs on rs.id = i.run_step_id
    join public.operational_workflow_runs r on r.id = rs.run_id
    where r.program_id = p_program_id
      and i.status = 'running'
      and i.updated_at < v_cutoff
    on conflict do nothing;
  else
    insert into public.operational_workflow_violation_registry(program_id, entity_type, entity_id, violation_type, severity, status, detected_at)
    select
      p_program_id,
      'invocation',
      i.id,
      'stale_running',
      'high',
      'open',
      v_now
    from public.operational_workflow_invocations i
    join public.operational_workflow_run_steps rs on rs.id = i.run_step_id
    join public.operational_workflow_runs r on r.id = rs.run_id
    where r.program_id = p_program_id
      and i.status = 'running'
      and i.created_at < v_cutoff
    on conflict do nothing;
  end if;
  get diagnostics ins_invocations = row_count;

  if to_regclass('public.operational_workflow_schedule_firings') is not null then
    if has_firings_updated_at then
      insert into public.operational_workflow_violation_registry(program_id, entity_type, entity_id, violation_type, severity, status, detected_at)
      select
        p_program_id,
        'firing',
        f.id,
        'stale_active',
        'medium',
        'open',
        v_now
      from public.operational_workflow_schedule_firings f
      where f.program_id = p_program_id
        and f.status in ('running','pending')
        and f.updated_at < v_cutoff
      on conflict do nothing;
    else
      insert into public.operational_workflow_violation_registry(program_id, entity_type, entity_id, violation_type, severity, status, detected_at)
      select
        p_program_id,
        'firing',
        f.id,
        'stale_active',
        'medium',
        'open',
        v_now
      from public.operational_workflow_schedule_firings f
      where f.program_id = p_program_id
        and f.status in ('running','pending')
        and coalesce(f.started_at, f.created_at) < v_cutoff
      on conflict do nothing;
    end if;
    get diagnostics ins_firings = row_count;
  end if;

  ins_total := ins_runs + ins_steps + ins_invocations + ins_firings;

  return jsonb_build_object(
    'program_id', p_program_id,
    'stale_minutes', v_minutes,
    'executed_at', v_now,
    'inserted_total', ins_total,
    'inserted', jsonb_build_object(
      'runs', ins_runs,
      'run_steps', ins_steps,
      'invocations', ins_invocations,
      'firings', ins_firings
    )
  );
end;
$$;
