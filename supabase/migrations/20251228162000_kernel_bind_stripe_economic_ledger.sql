create or replace function public.kernel_ingest_stripe_event(
  p_program_id uuid,
  p_event_type text,
  p_amount numeric,
  p_currency text,
  p_external_ref text,
  p_calculation_json jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
as $$
declare
  v_event_id uuid;
begin
  insert into public.canonical_events(
    program_id,
    event_domain,
    event_type,
    scope_type,
    source_system,
    payload
  ) values (
    p_program_id,
    'economic',
    p_event_type,
    'program',
    'stripe',
    jsonb_build_object('external_ref', p_external_ref)
  )
  returning id into v_event_id;

  insert into public.economic_ledger(
    canonical_event_id,
    ledger_type,
    amount,
    currency,
    external_ref,
    calculation_json,
    status
  ) values (
    v_event_id,
    p_event_type,
    p_amount,
    coalesce(p_currency,'USD'),
    p_external_ref,
    p_calculation_json,
    'posted'
  );

  return v_event_id;
end;
$$;

revoke all on function public.kernel_ingest_stripe_event(uuid,text,numeric,text,text,jsonb) from public;
grant execute on function public.kernel_ingest_stripe_event(uuid,text,numeric,text,text,jsonb) to authenticated;
