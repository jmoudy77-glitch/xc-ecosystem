create or replace function public.ops_on_run_status_change_finalize_steps()
returns trigger
language plpgsql
as $$
begin
  if (new.status in ('completed','failed')) and (new.status is distinct from old.status) then
    update public.operational_workflow_run_steps
    set status = case when new.status = 'completed' then 'completed' else 'failed' end,
        completed_at = coalesce(completed_at, now())
    where run_id = new.id
      and status not in ('completed','failed');

    insert into public.operational_workflow_run_step_transitions (run_step_id, from_status, to_status, message, meta)
    select
      rs.id,
      rs.status,
      case when new.status = 'completed' then 'completed' else 'failed' end,
      'run_finalized',
      jsonb_build_object('run_id', new.id)
    from public.operational_workflow_run_steps rs
    where rs.run_id = new.id
      and rs.status not in ('completed','failed');
  end if;
  return new;
end;
$$;

drop trigger if exists ops_on_run_status_change_finalize_steps on public.operational_workflow_runs;
create trigger ops_on_run_status_change_finalize_steps
after update of status on public.operational_workflow_runs
for each row
execute function public.ops_on_run_status_change_finalize_steps();
