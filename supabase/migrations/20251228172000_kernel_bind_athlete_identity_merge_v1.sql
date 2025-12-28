-- Kernel v1 — Athlete Identity Merge Binding (S5)
-- Constitutional pattern:
-- canonical_events -> identity ledger (athlete_identity_events) -> downstream feature pointer rewrites

-- 1) Extend athlete_identity_events with canonical_event binding (non-breaking: nullable for legacy rows)
alter table public.athlete_identity_events
  add column if not exists canonical_event_id uuid;

do $$
begin
  -- Add FK if not exists
  if not exists (
    select 1
    from pg_constraint
    where conname = 'athlete_identity_events_canonical_event_id_fkey'
  ) then
    alter table public.athlete_identity_events
      add constraint athlete_identity_events_canonical_event_id_fkey
      foreign key (canonical_event_id)
      references public.canonical_events(id)
      on delete cascade;
  end if;
end $$;

-- Ensure at most one identity ledger row per canonical event (when provided)
create unique index if not exists athlete_identity_events_canonical_event_id_uniq
  on public.athlete_identity_events(canonical_event_id)
  where canonical_event_id is not null;

-- 2) Kernel RPC: merge athlete identity (atomic)
create or replace function public.kernel_merge_athletes_v1(
  p_program_id uuid,
  p_canonical_athlete_id uuid,
  p_source_athlete_id uuid,
  p_details jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
  v_event_id uuid;
begin
  v_actor := public.current_app_user_id();
  if v_actor is null then
    raise exception 'kernel_merge_athletes_v1: no app user for auth.uid()';
  end if;

  -- membership enforcement (constitutional gate)
  if not exists (
    select 1
    from public.program_members pm
    where pm.program_id = p_program_id
      and pm.user_id = v_actor
  ) then
    raise exception 'kernel_merge_athletes_v1: actor not member of program %', p_program_id;
  end if;

  if p_canonical_athlete_id is null or p_source_athlete_id is null then
    raise exception 'kernel_merge_athletes_v1: canonical/source athlete ids required';
  end if;

  if p_canonical_athlete_id = p_source_athlete_id then
    raise exception 'kernel_merge_athletes_v1: canonical and source athlete must differ';
  end if;

  -- 1) canonical event (identity domain)
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
    v_actor,
    'rpc',
    jsonb_build_object('source_athlete_id', p_source_athlete_id),
    jsonb_build_object(
      'canonical_athlete_id', p_canonical_athlete_id,
      'source_athlete_id', p_source_athlete_id,
      'details', coalesce(p_details, '{}'::jsonb)
    )
  )
  returning id into v_event_id;

  -- 2) identity ledger row (append-only)
  insert into public.athlete_identity_events(
    canonical_event_id,
    event_type,
    canonical_athlete_id,
    source_athlete_id,
    program_id,
    actor_user_id,
    details
  ) values (
    v_event_id,
    'merged',
    p_canonical_athlete_id,
    p_source_athlete_id,
    p_program_id,
    v_actor,
    coalesce(p_details, '{}'::jsonb)
  );

  -- 3) feature pointer rewrites (downstream of canonical event)
  -- NOTE: We do not delete the source athlete row in v1. We re-point references.
  update public.program_athletes set athlete_id = p_canonical_athlete_id
    where program_id = p_program_id and athlete_id = p_source_athlete_id;

  update public.team_roster set athlete_id = p_canonical_athlete_id
    where program_id = p_program_id and athlete_id = p_source_athlete_id;

  update public.athlete_media set athlete_id = p_canonical_athlete_id
    where athlete_id = p_source_athlete_id;

  update public.athlete_performances set athlete_id = p_canonical_athlete_id
    where athlete_id = p_source_athlete_id;

  update public.athlete_scores set athlete_id = p_canonical_athlete_id
    where athlete_id = p_source_athlete_id;

  update public.athlete_training_sessions set athlete_id = p_canonical_athlete_id
    where program_id = p_program_id and athlete_id = p_source_athlete_id;

  update public.athlete_scholarship_history set athlete_id = p_canonical_athlete_id
    where athlete_id = p_source_athlete_id;

  update public.program_athlete_notes set athlete_id = p_canonical_athlete_id
    where program_id = p_program_id and athlete_id = p_source_athlete_id;

  update public.program_athlete_scores set athlete_id = p_canonical_athlete_id
    where program_id = p_program_id and athlete_id = p_source_athlete_id;

  update public.athlete_inquiries set athlete_id = p_canonical_athlete_id
    where program_id = p_program_id and athlete_id = p_source_athlete_id;

  update public.athlete_invites set athlete_id = p_canonical_athlete_id
    where program_id = p_program_id and athlete_id = p_source_athlete_id;

  update public.recruiting_profiles set athlete_id = p_canonical_athlete_id
    where athlete_id = p_source_athlete_id;

  update public.transfer_portal_entries set athlete_id = p_canonical_athlete_id
    where athlete_id = p_source_athlete_id;

  -- Optional: flag source athlete for review (keeps it visible for admin cleanup without new enums)
  update public.athletes
    set needs_identity_review = true
    where id = p_source_athlete_id;

  return v_event_id;
end;
$$;

revoke all on function public.kernel_merge_athletes_v1(uuid, uuid, uuid, jsonb) from public;
grant execute on function public.kernel_merge_athletes_v1(uuid, uuid, uuid, jsonb) to authenticated;
