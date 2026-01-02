create or replace function public.ops_try_advance_run_from_invocation(p_invocation_id uuid)
returns void
language plpgsql
as $$
declare
  inv public.operational_workflow_invocations;
  rs public.operational_workflow_run_steps;
begin
  select * into inv
  from public.operational_workflow_invocations
  where id = p_invocation_id;

  if not found then
    return;
  end if;

  select * into rs
  from public.operational_workflow_run_steps
  where id = inv.run_step_id;

  if not found then
    return;
  end if;

  if rs.status in ('completed','failed') then
    perform public.ops_advance_workflow_run(rs.run_id);
  end if;
end;
$$;

create or replace function public.tg_ops_on_invocation_finalize_advance()
returns trigger
language plpgsql
as $$
begin
  if (new.status is distinct from old.status) and (new.status in ('completed','failed')) then
    perform public.ops_try_advance_run_from_invocation(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists ops_on_invocation_finalize_advance on public.operational_workflow_invocations;
create trigger ops_on_invocation_finalize_advance
after update of status on public.operational_workflow_invocations
for each row
execute function public.tg_ops_on_invocation_finalize_advance();
