alter table public.operational_workflow_runs
  add column if not exists idempotency_key text;

create unique index if not exists workflow_runs_idempotency_unique_idx
  on public.operational_workflow_runs (program_id, workflow_id, idempotency_key)
  where idempotency_key is not null;

create or replace function public.ops_create_workflow_run(
  p_workflow_id uuid,
  p_program_id uuid,
  p_idempotency_key text default null
)
returns table (id uuid, status text)
language plpgsql
as $$
begin
  if p_idempotency_key is not null then
    return query
    insert into public.operational_workflow_runs (workflow_id, program_id, status, idempotency_key)
    values (p_workflow_id, p_program_id, 'pending', p_idempotency_key)
    on conflict (program_id, workflow_id, idempotency_key)
    do update set idempotency_key = excluded.idempotency_key
    returning operational_workflow_runs.id, operational_workflow_runs.status;
  else
    return query
    insert into public.operational_workflow_runs (workflow_id, program_id, status)
    values (p_workflow_id, p_program_id, 'pending')
    returning operational_workflow_runs.id, operational_workflow_runs.status;
  end if;
end;
$$;
