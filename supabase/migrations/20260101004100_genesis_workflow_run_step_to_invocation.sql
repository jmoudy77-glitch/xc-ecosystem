alter table public.operational_workflow_run_steps
  add column if not exists invocation_id uuid;

create index if not exists workflow_run_steps_invocation_id_idx
  on public.operational_workflow_run_steps (invocation_id);

create or replace function public.ops_enqueue_next_invocation_for_run(p_run_id uuid, p_idempotency_key text default null)
returns table (
  run_id uuid,
  run_status text,
  run_step_id uuid,
  action_key text,
  invocation_id uuid,
  invocation_status text
)
language plpgsql
as $$
declare
  adv record;
  inv record;
  v_idem text;
begin
  select * into adv
  from public.ops_advance_workflow_run(p_run_id)
  limit 1;

  if adv.next_run_step_id is null then
    return query select adv.run_id, adv.run_status, null::uuid, null::text, null::uuid, null::text;
    return;
  end if;

  v_idem := case
    when p_idempotency_key is not null then p_idempotency_key
    else encode(gen_random_bytes(16), 'hex')
  end;

  select * into inv
  from public.ops_enqueue_workflow_invocation(
    adv.next_run_step_id,
    adv.next_action_key,
    coalesce(adv.next_input, '{}'::jsonb),
    v_idem
  )
  limit 1;

  update public.operational_workflow_run_steps
  set invocation_id = inv.id
  where id = adv.next_run_step_id
    and invocation_id is distinct from inv.id;

  return query
  select adv.run_id, adv.run_status, adv.next_run_step_id, adv.next_action_key, inv.id, inv.status;
end;
$$;
