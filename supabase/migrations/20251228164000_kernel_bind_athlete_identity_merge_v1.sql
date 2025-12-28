-- Kernel v1 — Athlete Identity Merge Binding
-- Constitutional pattern: canonical_events -> athlete_identity_events -> feature repointing

create or replace function public.kernel_merge_athlete_identity(
  p_program_id uuid,
  p_canonical_athlete_id uuid,
  p_source_athlete_id uuid,
  p_actor_user_id uuid,
  p_details jsonb default '{}'::jsonb,
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
  if p_canonical_athlete_id = p_source_athlete_id then
    raise exception 'canonical_athlete_id and source_athlete_id cannot be the same'
      using errcode = '22023';
  end if;

  -- Lock both athlete rows to prevent concurrent merges
  perform 1 from public.athletes a
    where a.id in (p_canonical_athlete_id, p_source_athlete_id)
    for update;

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
    'identity',
    'athlete_merged',
    'athlete',
    p_canonical_athlete_id,
    p_actor_user_id,
    p_source_system,
    coalesce(p_causality, '{}'::jsonb),
    jsonb_build_object(
      'canonical_athlete_id', p_canonical_athlete_id,
      'source_athlete_id', p_source_athlete_id,
      'details', coalesce(p_details, '{}'::jsonb),
      'caller_payload', coalesce(p_payload, '{}'::jsonb)
    )
  )
  returning id into v_event_id;

  -- 2) athlete_identity_events (identity domain record)
  insert into public.athlete_identity_events(
    event_type,
    canonical_athlete_id,
    source_athlete_id,
    program_id,
    actor_user_id,
    details
  ) values (
    'merged',
    p_canonical_athlete_id,
    p_source_athlete_id,
    p_program_id,
    p_actor_user_id,
    jsonb_build_object(
      'canonical_event_id', v_event_id,
      'details', coalesce(p_details, '{}'::jsonb)
    )
  );

  -- 3) Feature repointing (minimal v1 set)
  update public.athlete_performances
    set athlete_id = p_canonical_athlete_id
  where athlete_id = p_source_athlete_id;

  update public.athlete_media
    set athlete_id = p_canonical_athlete_id
  where athlete_id = p_source_athlete_id;

  update public.program_athletes
    set athlete_id = p_canonical_athlete_id
  where athlete_id = p_source_athlete_id;

  update public.program_athlete_scores
    set athlete_id = p_canonical_athlete_id
  where athlete_id = p_source_athlete_id;

  update public.program_athlete_notes
    set athlete_id = p_canonical_athlete_id
  where athlete_id = p_source_athlete_id;

  update public.athlete_training_sessions
    set athlete_id = p_canonical_athlete_id
  where athlete_id = p_source_athlete_id;

  update public.team_roster
    set athlete_id = p_canonical_athlete_id
  where athlete_id = p_source_athlete_id;

  -- v1 canonicalization marker (soft) on source athlete
  update public.athletes
    set needs_identity_review = false,
        identity_confidence = 'weak'
  where id = p_source_athlete_id;

  return v_event_id;
end;
$$;

revoke all on function public.kernel_merge_athlete_identity(
  uuid, uuid, uuid, uuid, jsonb, text, jsonb, jsonb
) from public;

grant execute on function public.kernel_merge_athlete_identity(
  uuid, uuid, uuid, uuid, jsonb, text, jsonb, jsonb
) to authenticated;
