-- Kernel v1 — Scholarship Budget Binding (Team Season)
-- Constitutional pattern: canonical_events -> entitlement_ledger -> feature write

create or replace function public.kernel_upsert_team_season_scholarship_budget(
  p_program_id uuid,
  p_team_season_id uuid,
  p_actor_user_id uuid,
  p_budget_equivalents numeric,
  p_budget_amount numeric,
  p_currency text default 'USD',
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

  v_old_equivalents numeric;
  v_old_amount numeric;
  v_old_currency text;

  v_value_json jsonb;
begin
  -- Lock the projection row and capture before state
  select
    ts.scholarship_budget_equivalents,
    ts.scholarship_budget_amount,
    ts.scholarship_currency
  into
    v_old_equivalents,
    v_old_amount,
    v_old_currency
  from public.team_seasons ts
  where ts.id = p_team_season_id
    and ts.program_id = p_program_id
  for update;

  if not found then
    raise exception 'team_seasons not found for program_id %, team_season_id %', p_program_id, p_team_season_id
      using errcode = 'P0002';
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
    'entitlement',
    'scholarship_budget_upsert',
    'team_season',
    p_team_season_id,
    p_actor_user_id,
    p_source_system,
    coalesce(p_causality, '{}'::jsonb),
    jsonb_build_object(
      'team_season_id', p_team_season_id,
      'before', jsonb_build_object(
        'equivalents', v_old_equivalents,
        'amount', v_old_amount,
        'currency', v_old_currency
      ),
      'requested', jsonb_build_object(
        'equivalents', p_budget_equivalents,
        'amount', p_budget_amount,
        'currency', coalesce(p_currency, 'USD')
      ),
      'caller_payload', coalesce(p_payload, '{}'::jsonb)
    )
  )
  returning id into v_event_id;

  -- 2) entitlement_ledger (append-only, 1:1 with canonical_event_id)
  v_value_json :=
    jsonb_build_object(
      'scope', jsonb_build_object(
        'scope_type', 'team_season',
        'scope_id', p_team_season_id
      ),
      'before', jsonb_build_object(
        'equivalents', v_old_equivalents,
        'amount', v_old_amount,
        'currency', v_old_currency
      ),
      'after', jsonb_build_object(
        'equivalents', p_budget_equivalents,
        'amount', p_budget_amount,
        'currency', coalesce(p_currency, 'USD')
      ),
      'delta', jsonb_build_object(
        'equivalents', coalesce(p_budget_equivalents, 0) - coalesce(v_old_equivalents, 0),
        'amount', coalesce(p_budget_amount, 0) - coalesce(v_old_amount, 0)
      ),
      'metadata', jsonb_build_object(
        'source_system', p_source_system
      )
    );

  insert into public.entitlement_ledger(
    canonical_event_id,
    beneficiary_type,
    beneficiary_id,
    entitlement_type,
    value_json,
    status
  ) values (
    v_event_id,
    'team_season',
    p_team_season_id,
    'scholarship_budget',
    v_value_json,
    'active'
  );

  -- 3) feature write (projection)
  update public.team_seasons
  set
    scholarship_budget_equivalents = p_budget_equivalents,
    scholarship_budget_amount = p_budget_amount,
    scholarship_currency = coalesce(p_currency, 'USD')
  where id = p_team_season_id;

  -- 4) legacy history write (non-sovereign compatibility)
  insert into public.season_budget_history(
    team_season_id,
    changed_by_user_id,
    old_scholarship_budget_equivalents,
    new_scholarship_budget_equivalents,
    old_scholarship_budget_amount,
    new_scholarship_budget_amount
  ) values (
    p_team_season_id,
    p_actor_user_id,
    v_old_equivalents,
    p_budget_equivalents,
    v_old_amount,
    p_budget_amount
  );

  return v_event_id;
end;
$$;

revoke all on function public.kernel_upsert_team_season_scholarship_budget(
  uuid, uuid, uuid, numeric, numeric, text, text, jsonb, jsonb
) from public;

grant execute on function public.kernel_upsert_team_season_scholarship_budget(
  uuid, uuid, uuid, numeric, numeric, text, text, jsonb, jsonb
) to authenticated;
