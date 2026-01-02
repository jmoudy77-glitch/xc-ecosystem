create or replace function public.ops_workflow_self_heal_full(
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

  healed_runs integer := 0;
  healed_steps integer := 0;
  healed_invocations integer := 0;
  healed_firings integer := 0;

  has_runs_updated_at boolean := false;
  has_steps_updated_at boolean := false;
  has_inv_updated_at boolean := false;
  has_firings_updated_at boolean := false;

  resolved_violations integer := 0;
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
    execute format($q$
      update public.operational_workflow_runs r
         set status = 'pending',
             updated_at = %L
       where r.program_id = %L
         and r.status = 'running'
         and r.updated_at < %L
    $q$, v_now, p_program_id, v_cutoff);
  else
    execute format($q$
      update public.operational_workflow_runs r
         set status = 'pending'
       where r.program_id = %L
         and r.status = 'running'
         and r.created_at < %L
    $q$, p_program_id, v_cutoff);
  end if;
  get diagnostics healed_runs = row_count;

  if has_steps_updated_at then
    execute format($q$
      update public.operational_workflow_run_steps rs
         set status = 'failed',
             completed_at = coalesce(rs.completed_at, %L),
             updated_at = %L
       where rs.status in ('running','pending')
         and rs.created_at < %L
         and rs.run_id in (
           select r.id from public.operational_workflow_runs r
           where r.program_id = %L
         )
    $q$, v_now, v_now, v_cutoff, p_program_id);
  else
    execute format($q$
      update public.operational_workflow_run_steps rs
         set status = 'failed',
             completed_at = coalesce(rs.completed_at, %L)
       where rs.status in ('running','pending')
         and rs.created_at < %L
         and rs.run_id in (
           select r.id from public.operational_workflow_runs r
           where r.program_id = %L
         )
    $q$, v_now, v_cutoff, p_program_id);
  end if;
  get diagnostics healed_steps = row_count;

  if has_inv_updated_at then
    execute format($q$
      update public.operational_workflow_invocations i
         set status = 'failed',
             completed_at = coalesce(i.completed_at, %L),
             updated_at = %L
       where i.status = 'running'
         and i.created_at < %L
         and exists (
           select 1
           from public.operational_workflow_run_steps rs
           join public.operational_workflow_runs r on r.id = rs.run_id
           where rs.id = i.run_step_id
             and r.program_id = %L
         )
    $q$, v_now, v_now, v_cutoff, p_program_id);
  else
    execute format($q$
      update public.operational_workflow_invocations i
         set status = 'failed',
             completed_at = coalesce(i.completed_at, %L)
       where i.status = 'running'
         and i.created_at < %L
         and exists (
           select 1
           from public.operational_workflow_run_steps rs
           join public.operational_workflow_runs r on r.id = rs.run_id
           where rs.id = i.run_step_id
             and r.program_id = %L
         )
    $q$, v_now, v_cutoff, p_program_id);
  end if;
  get diagnostics healed_invocations = row_count;

  if to_regclass('public.operational_workflow_schedule_firings') is not null then
    if has_firings_updated_at then
      execute format($q$
        update public.operational_workflow_schedule_firings f
           set status = 'failed',
               updated_at = %L
         where f.program_id = %L
           and f.status in ('running','pending')
           and f.created_at < %L
      $q$, v_now, p_program_id, v_cutoff);
    else
      execute format($q$
        update public.operational_workflow_schedule_firings f
           set status = 'failed'
         where f.program_id = %L
           and f.status in ('running','pending')
           and coalesce(f.started_at, f.created_at) < %L
      $q$, p_program_id, v_cutoff);
    end if;
    get diagnostics healed_firings = row_count;
  end if;

  update public.operational_workflow_violation_registry v
     set status = 'resolved',
         resolved_at = v_now
   where v.program_id = p_program_id
     and v.status = 'open'
     and v.violation_type in ('stale_running','stale_active');
  get diagnostics resolved_violations = row_count;

  return jsonb_build_object(
    'program_id', p_program_id,
    'stale_minutes', v_minutes,
    'executed_at', v_now,
    'healed', jsonb_build_object(
      'runs', healed_runs,
      'run_steps', healed_steps,
      'invocations', healed_invocations,
      'firings', healed_firings
    ),
    'violations_resolved', resolved_violations
  );
end;
$$;
