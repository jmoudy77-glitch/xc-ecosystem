alter table public.operational_workflow_schedule_firings
  add column if not exists completed_at timestamptz;

alter table public.operational_workflow_schedule_firings
  drop constraint if exists operational_workflow_schedule_firings_status_check;

alter table public.operational_workflow_schedule_firings
  add constraint operational_workflow_schedule_firings_status_check
  check (status in ('queued','started','completed','failed'));

create or replace function public.tg_ops_finalize_firing_on_run_status()
returns trigger
language plpgsql
as $$
begin
  if (new.status is distinct from old.status) and (new.status in ('completed','failed')) then
    update public.operational_workflow_schedule_firings
    set status = case when new.status = 'completed' then 'completed' else 'failed' end,
        completed_at = now(),
        error = case when new.status = 'completed' then null else coalesce((new.result->>'error'), error) end
    where run_id = new.id
      and status = 'started';
  end if;
  return new;
end;
$$;

drop trigger if exists ops_finalize_firing_on_run_status on public.operational_workflow_runs;
create trigger ops_finalize_firing_on_run_status
after update of status on public.operational_workflow_runs
for each row
execute function public.tg_ops_finalize_firing_on_run_status();
