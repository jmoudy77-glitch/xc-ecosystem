-- Kernel v1 — Scholarship Binding (Team Roster Allocation)
-- Constitutional pattern: canonical_events -> entitlement_ledger -> feature write
-- NOTE: No ':' bind params. Function parameters are referenced directly.

create or replace function public.kernel_upsert_team_roster_scholarship(
  p_program_id uuid,
  p_team_roster_id uuid,
  p_actor_user_id uuid,
  p_scholarship_unit text,
  p_scholarship_amount numeric,
  p_scholarship_notes text default null,
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
  v_team_id uuid;
  v_team_season_id uuid;
  v_athlete_id uuid;

  v_old_amount numeric;
  v_old_unit text;
  v_old_notes text;

  v_value_json jsonb;
begin
  -- Validate unit against the same set enforced by team_roster constraint
  if p_scholarship_unit not in ('percent','equivalency','amount') then
    raise exception 'Invalid scholarship_unit: %', p_scholarship_unit
      using errcode = '22023';
  end if;

  -- Lock the projection row and capture before state
  select
    tr.team_id,
    tr.team_season_id,
    tr.athlete_id,
    tr.scholarship_amount,
    tr.scholarship_unit,
    tr.scholarship_notes
  into
    v_team_id,
    v_team_season_id,
    v_athlete_id,
    v_old_amount,
    v_old_unit,
    v_old_notes
  from public.team_roster tr
  where tr.id = p_team_roster_id
    and tr.program_id = p_program_id
  for update;

  if not found then
    raise exception 'team_roster not found for program_id %, team_roster_id %', p_program_id, p_team_roster_id
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
    'scholarship_allocation_upsert',
    'team_roster',
    p_team_roster_id,
    p_actor_user_id,
    p_source_system,
    coalesce(p_causality, '{}'::jsonb),
    jsonb_build_object(
      'team_roster_id', p_team_roster_id,
      'team_id', v_team_id,
      'team_season_id', v_team_season_id,
      'athlete_id', v_athlete_id,
      'requested', jsonb_build_object(
        'unit', p_scholarship_unit,
        'amount', p_scholarship_amount,
        'notes', p_scholarship_notes
      ),
      'caller_payload', coalesce(p_payload, '{}'::jsonb)
    )
  )
  returning id into v_event_id;

  -- 2) entitlement_ledger (append-only, 1:1 with canonical_event_id)
  v_value_json :=
    jsonb_build_object(
      'scope', jsonb_build_object(
        'scope_type', 'team_roster',
        'scope_id', p_team_roster_id,
        'team_id', v_team_id,
        'team_season_id', v_team_season_id,
        'athlete_id', v_athlete_id
      ),
      'before', jsonb_build_object(
        'unit', v_old_unit,
        'amount', v_old_amount,
        'notes', v_old_notes
      ),
      'after', jsonb_build_object(
        'unit', p_scholarship_unit,
        'amount', p_scholarship_amount,
        'notes', p_scholarship_notes
      ),
      'delta', jsonb_build_object(
        'amount', coalesce(p_scholarship_amount, 0) - coalesce(v_old_amount, 0)
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
    'athlete',
    v_athlete_id,
    'scholarship_allocation',
    v_value_json,
    'active'
  );

  -- 3) feature write (projection)
  update public.team_roster
  set
    scholarship_amount = p_scholarship_amount,
    scholarship_unit = p_scholarship_unit,
    scholarship_notes = p_scholarship_notes
  where id = p_team_roster_id;

  -- 4) legacy history write (non-sovereign compatibility)
  insert into public.athlete_scholarship_history(
    team_season_id,
    roster_entry_id,
    athlete_id,
    changed_by_user_id,
    old_amount,
    new_amount,
    old_unit,
    new_unit,
    notes
  ) values (
    v_team_season_id,
    p_team_roster_id,
    v_athlete_id,
    p_actor_user_id,
    v_old_amount,
    p_scholarship_amount,
    v_old_unit,
    p_scholarship_unit,
    p_scholarship_notes
  );

  return v_event_id;
end;
$$;

revoke all on function public.kernel_upsert_team_roster_scholarship(
  uuid, uuid, uuid, text, numeric, text, text, jsonb, jsonb
) from public;

grant execute on function public.kernel_upsert_team_roster_scholarship(
  uuid, uuid, uuid, text, numeric, text, text, jsonb, jsonb
) to authenticated;
