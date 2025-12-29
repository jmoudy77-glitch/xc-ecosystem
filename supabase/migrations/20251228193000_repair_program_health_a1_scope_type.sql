-- XC-Ecosystem — Kernel v1
-- Promotion 51: Repair Program Health A1 canonical event insert for scope_type NOT NULL

begin;

create or replace function public.kernel_program_health_a1_emit(
  p_program_id uuid,
  p_sport text,
  p_horizon text,
  p_inputs_hash text,
  p_result_payload jsonb,
  p_engine_version text default 'a1_v1',
  p_scope_id uuid default null,
  p_actor_user_id uuid default null
)
returns table (
  canonical_event_id uuid,
  ledger_id uuid,
  absences_upserted int,
  snapshot_written boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_canonical_event_id uuid;
  v_ledger_id uuid;
  v_absences_upserted int := 0;
  v_snapshot_written boolean := false;
  v_event_payload jsonb;
  v_summary jsonb;
  v_scope_type text;
begin
  if p_sport not in ('xc','tf') then
    raise exception 'Invalid sport: %', p_sport using errcode = '22023';
  end if;

  if p_horizon not in ('H0','H1','H2','H3') then
    raise exception 'Invalid horizon: %', p_horizon using errcode = '22023';
  end if;

  if coalesce(p_inputs_hash, '') = '' then
    raise exception 'inputs_hash is required' using errcode = '22023';
  end if;

  if p_result_payload is null then
    raise exception 'result_payload is required' using errcode = '22023';
  end if;

  v_event_payload := jsonb_build_object(
    'sport', p_sport,
    'horizon', p_horizon,
    'inputs_hash', p_inputs_hash,
    'engine_version', coalesce(p_engine_version, 'a1_v1'),
    'result_summary', coalesce(p_result_payload->'summary', '{}'::jsonb)
  );

  -- Deterministic scope typing:
  -- Default: program-scoped evaluation unless a future scoped binding is used.
  v_scope_type := case when p_scope_id is null then 'program' else 'scope' end;

  insert into public.canonical_events (
    program_id,
    event_domain,
    event_type,
    scope_type,
    scope_id,
    actor_user_id,
    payload
  )
  values (
    p_program_id,
    'program_health',
    'program_health.a1_evaluated',
    v_scope_type,
    p_scope_id,
    p_actor_user_id,
    v_event_payload
  )
  returning id into v_canonical_event_id;

  insert into public.program_health_ledger (
    canonical_event_id,
    program_id,
    engine_version,
    sport,
    horizon,
    inputs_hash,
    result_payload
  )
  values (
    v_canonical_event_id,
    p_program_id,
    coalesce(p_engine_version, 'a1_v1'),
    p_sport,
    p_horizon,
    p_inputs_hash,
    p_result_payload
  )
  returning id into v_ledger_id;

  with incoming as (
    select
      (a->>'absence_key')::text as absence_key,
      (a->>'absence_type')::text as absence_type,
      nullif(a->>'severity','')::text as severity,
      coalesce(a->'details','{}'::jsonb) as details
    from jsonb_array_elements(coalesce(p_result_payload->'absences','[]'::jsonb)) as a
    where coalesce(a->>'absence_key','') <> '' and coalesce(a->>'absence_type','') <> ''
  ),
  upserted as (
    insert into public.program_health_absences (
      program_id,
      scope_id,
      sport,
      horizon,
      absence_key,
      absence_type,
      severity,
      details,
      canonical_event_id,
      ledger_id,
      created_at,
      updated_at
    )
    select
      p_program_id,
      p_scope_id,
      p_sport,
      p_horizon,
      i.absence_key,
      i.absence_type,
      i.severity,
      i.details,
      v_canonical_event_id,
      v_ledger_id,
      now(),
      now()
    from incoming i
    on conflict (program_id, coalesce(scope_id,'00000000-0000-0000-0000-000000000000'::uuid), sport, horizon, absence_key)
    do update set
      absence_type = excluded.absence_type,
      severity = excluded.severity,
      details = excluded.details,
      canonical_event_id = excluded.canonical_event_id,
      ledger_id = excluded.ledger_id,
      updated_at = now()
    returning 1
  )
  select count(*) into v_absences_upserted from upserted;

  v_summary := coalesce(p_result_payload->'summary', '{}'::jsonb);

  insert into public.program_health_snapshots (
    program_id,
    scope_id,
    sport,
    horizon,
    canonical_event_id,
    ledger_id,
    inputs_hash,
    summary,
    full_payload
  )
  values (
    p_program_id,
    p_scope_id,
    p_sport,
    p_horizon,
    v_canonical_event_id,
    v_ledger_id,
    p_inputs_hash,
    v_summary,
    p_result_payload
  );

  v_snapshot_written := true;

  canonical_event_id := v_canonical_event_id;
  ledger_id := v_ledger_id;
  absences_upserted := v_absences_upserted;
  snapshot_written := v_snapshot_written;
  return next;
end;
$$;

commit;
