-- Kernel v1 — AI Output Binding
-- Constitutional pattern: canonical_events -> ai_causal_ledger

create or replace function public.kernel_emit_ai_output(
  p_program_id uuid,
  p_scope_type text,
  p_scope_id uuid,
  p_actor_user_id uuid,
  p_model_version text,
  p_tier integer,
  p_inputs_fingerprint text,
  p_drivers_json jsonb default '{}'::jsonb,
  p_confidence numeric default null,
  p_data_lineage jsonb default '{}'::jsonb,
  p_output_json jsonb default '{}'::jsonb,
  p_source_system text default 'rpc',
  p_causality jsonb default '{}'::jsonb,
  p_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_event_id uuid;
begin
  if p_tier < 0 or p_tier > 3 then
    raise exception 'Invalid tier: % (expected 0..3)', p_tier using errcode = '22023';
  end if;

  if p_confidence is not null and (p_confidence < 0 or p_confidence > 1) then
    raise exception 'Invalid confidence: % (expected 0..1 or null)', p_confidence using errcode = '22023';
  end if;

  -- 1) canonical_events
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
    'ai',
    'ai_output_emitted',
    p_scope_type,
    p_scope_id,
    p_actor_user_id,
    p_source_system,
    coalesce(p_causality, '{}'::jsonb),
    jsonb_build_object(
      'model_version', p_model_version,
      'tier', p_tier,
      'inputs_fingerprint', p_inputs_fingerprint,
      'caller_payload', coalesce(p_payload, '{}'::jsonb)
    )
  )
  returning id into v_event_id;

  -- 2) ai_causal_ledger (append-only, 1:1 with canonical_event_id)
  insert into public.ai_causal_ledger(
    canonical_event_id,
    model_version,
    tier,
    inputs_fingerprint,
    drivers_json,
    confidence,
    data_lineage,
    output_json
  ) values (
    v_event_id,
    p_model_version,
    p_tier,
    p_inputs_fingerprint,
    coalesce(p_drivers_json, '{}'::jsonb),
    p_confidence,
    coalesce(p_data_lineage, '{}'::jsonb),
    coalesce(p_output_json, '{}'::jsonb)
  );

  return v_event_id;
end;
$$;

revoke all on function public.kernel_emit_ai_output(
  uuid, text, uuid, uuid, text, integer, text, jsonb, numeric, jsonb, jsonb, text, jsonb, jsonb
) from public;

grant execute on function public.kernel_emit_ai_output(
  uuid, text, uuid, uuid, text, integer, text, jsonb, numeric, jsonb, jsonb, text, jsonb, jsonb
) to authenticated;
