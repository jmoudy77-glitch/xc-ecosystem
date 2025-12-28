-- Kernel v1 — Stripe Economic Ledger Binding (S3)
-- Constitutional pattern: canonical_events -> economic_ledger
-- Stripe is processor-only; economic_ledger is source of truth.

create or replace function public.kernel_ingest_stripe_economic_event(
  p_program_id uuid,
  p_event_type text,
  p_amount numeric,
  p_currency text default 'USD',
  p_external_ref text default null,
  p_status text default 'posted',
  p_calculation_json jsonb default '{}'::jsonb,
  p_causality jsonb default '{}'::jsonb,
  p_payload jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
begin
  -- 1) canonical event (actor_user_id may be null for system ingress)
  insert into public.canonical_events(
    program_id,
    event_domain,
    event_type,
    scope_type,
    scope_id,
    actor_user_id,
    source_system,
    causality,
    payload
  ) values (
    p_program_id,
    'economic',
    p_event_type,
    'program',
    p_program_id,
    null,
    'stripe',
    coalesce(p_causality, '{}'::jsonb),
    jsonb_build_object(
      'external_ref', p_external_ref,
      'currency', coalesce(p_currency, 'USD'),
      'amount', coalesce(p_amount, 0),
      'status', coalesce(p_status, 'posted'),
      'calculation', coalesce(p_calculation_json, '{}'::jsonb),
      'caller_payload', coalesce(p_payload, '{}'::jsonb)
    )
  )
  returning id into v_event_id;

  -- 2) ledger row (append-only; 1:1 with canonical_event_id)
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
    coalesce(p_amount, 0),
    coalesce(p_currency, 'USD'),
    p_external_ref,
    coalesce(p_calculation_json, '{}'::jsonb),
    coalesce(p_status, 'posted')
  );

  return v_event_id;
end;
$$;

revoke all on function public.kernel_ingest_stripe_economic_event(
  uuid, text, numeric, text, text, text, jsonb, jsonb, jsonb
) from public;

grant execute on function public.kernel_ingest_stripe_economic_event(
  uuid, text, numeric, text, text, text, jsonb, jsonb, jsonb
) to authenticated;
