create or replace function public.ops_apply_invocation_result_to_run_step(p_invocation_id uuid)
returns void
language plpgsql
as $$
declare
  inv public.operational_workflow_invocations;
begin
  select *
  into inv
  from public.operational_workflow_invocations
  where id = p_invocation_id;

  if not found then
    return;
  end if;

  update public.operational_workflow_run_steps
  set status = case inv.status
                when 'completed' then 'completed'
                when 'failed' then 'failed'
                else status
              end,
      completed_at = case when inv.status in ('completed','failed') then now() else completed_at end,
      output = case when inv.status in ('completed','failed') then inv.output else output end
  where id = inv.run_step_id;

  insert into public.operational_workflow_run_step_transitions (
    run_step_id,
    from_status,
    to_status,
    message,
    meta
  )
  select
    inv.run_step_id,
    rs.status,
    case inv.status when 'completed' then 'completed' when 'failed' then 'failed' else rs.status end,
    case inv.status when 'completed' then 'invocation_completed' when 'failed' then 'invocation_failed' else 'invocation_updated' end,
    jsonb_build_object('invocation_id', inv.id, 'action_key', inv.action_key)
  from public.operational_workflow_run_steps rs
  where rs.id = inv.run_step_id
  on conflict do nothing;
end;
$$;

create or replace function public.tg_ops_on_invocation_status_change()
returns trigger
language plpgsql
as $$
begin
  if (new.status is distinct from old.status) and (new.status in ('completed','failed')) then
    perform public.ops_apply_invocation_result_to_run_step(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists ops_on_invocation_status_change on public.operational_workflow_invocations;
create trigger ops_on_invocation_status_change
after update of status on public.operational_workflow_invocations
for each row
execute function public.tg_ops_on_invocation_status_change();
