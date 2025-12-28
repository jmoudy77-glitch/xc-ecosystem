-- XC-Ecosystem — Kernel v1
-- Promotion 46: Bind Program Health A1 evaluation emission
--
-- Sovereign write path:
-- Server Action / Cron / UI → Kernel RPC → canonical_events → program_health_ledger → derived feature tables
--
-- Invariants enforced by RPC:
-- 1) Emit canonical_events row
-- 2) Emit exactly one program_health_ledger row
-- 3) Share same canonical_event_id
-- 4) Derived writes occur downstream of canonical event, inside same transaction
--
-- NOTE: This migration assumes Kernel v1 spine already provides:
-- - public.canonical_events (id uuid PK, program_id uuid, event_type text, scope_id uuid, actor_user_id uuid, payload jsonb, created_at timestamptz)
-- Adjust column names only if your canonical_events schema differs.

begin;

-- ---------------------------------------------------------------------
-- 1) Domain Ledger: program_health_ledger (append-only)
-- ---------------------------------------------------------------------
create table if not exists public.program_health_ledger (
  id uuid primary key default gen_random_uuid(),

  canonical_event_id uuid not null,
  program_id uuid not null,

  engine_version text not null default 'a1_v1',
  sport text not null check (sport in ('xc','tf')),
  horizon text not null check (horizon in ('H0','H1','H2','H3')),

  inputs_hash text not null,
  result_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists program_health_ledger_program_id_created_at_idx
  on public.program_health_ledger(program_id, created_at desc);

create index if not exists program_health_ledger_canonical_event_id_idx
  on public.program_health_ledger(canonical_event_id);

-- ---------------------------------------------------------------------
-- 2) Derived Feature Tables (non-authoritative; rebuildable from ledger)
-- ---------------------------------------------------------------------
create table if not exists public.program_health_absences (
  id uuid primary key default gen_random_uuid(),

  program_id uuid not null,
  scope_id uuid null, -- optional: team/season scope if used
  sport text not null check (sport in ('xc','tf')),
  horizon text not null check (horizon in ('H0','H1','H2','H3')),

  absence_key text not null,          -- deterministic key for idempotent upsert
  absence_type text not null,         -- capability-class label
  severity text null,                 -- optional
  details jsonb not null default '{}'::jsonb,

  canonical_event_id uuid not null,
  ledger_id uuid not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- one active record per (program_id, scope_id, sport, horizon, absence_key)
create unique index if not exists program_health_absences_uni
  on public.program_health_absences(program_id, coalesce(scope_id,'00000000-0000-0000-0000-000000000000'::uuid), sport, horizon, absence_key);

create index if not exists program_health_absences_program_id_horizon_idx
  on public.program_health_absences(program_id, horizon);

create table if not exists public.program_health_snapshots (
  id uuid primary key default gen_random_uuid(),

  program_id uuid not null,
  scope_id uuid null,
  sport text not null check (sport in ('xc','tf')),
  horizon text not null check (horizon in ('H0','H1','H2','H3')),

  canonical_event_id uuid not null,
  ledger_id uuid not null,

  inputs_hash text not null,
  summary jsonb not null default '{}'::jsonb,        -- counts/flags for UI fast-read
  full_payload jsonb not null default '{}'::jsonb,   -- optional cached full payload

  created_at timestamptz not null default now()
);

create index if not exists program_health_snapshots_program_id_created_at_idx
  on public.program_health_snapshots(program_id, created_at desc);

-- ---------------------------------------------------------------------
-- 3) Kernel RPC: kernel_program_health_a1_emit
-- ---------------------------------------------------------------------
-- Parameters are ordered to avoid Postgres default-argument signature errors.
-- No non-default args follow defaulted args.
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
begin
  -- Validate enumerations early (hard fail; sovereign write contract)
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

  -- Canonical event payload (minimum viable; can be extended downstream)
  v_event_payload := jsonb_build_object(
    'sport', p_sport,
    'horizon', p_horizon,
    'inputs_hash', p_inputs_hash,
    'engine_version', coalesce(p_engine_version, 'a1_v1'),
    'result_summary', coalesce(p_result_payload->'summary', '{}'::jsonb)
  );

  -- 1) canonical_events row
  insert into public.canonical_events (
    program_id,
    event_type,
    scope_id,
    actor_user_id,
    payload
  )
  values (
    p_program_id,
    'program_health.a1_evaluated',
    p_scope_id,
    p_actor_user_id,
    v_event_payload
  )
  returning id into v_canonical_event_id;

  -- 2) Exactly one program_health_ledger row
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

  -- 3) Derived writes (rebuildable; never authoritative)
  --
  -- Expected result_payload schema (recommended):
  -- {
  --   "summary": { ... counts/flags ... },
  --   "absences": [
  --     { "absence_key": "...", "absence_type": "...", "severity": "...", "details": {...} },
  --     ...
  --   ]
  -- }
  --
  -- Upsert absences
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

  -- Snapshot row (one per evaluation)
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

  -- Return contract
  canonical_event_id := v_canonical_event_id;
  ledger_id := v_ledger_id;
  absences_upserted := v_absences_upserted;
  snapshot_written := v_snapshot_written;
  return next;
end;
$$;

commit;
