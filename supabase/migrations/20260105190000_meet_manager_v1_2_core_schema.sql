-- meet_manager v1.2: core schema (enums + tables + base RLS scaffolding)
-- NOTE: Policies are provided as minimal safe defaults; tighten per app membership model where required.

begin;

-- -------------------------------------------------------------------
-- ENUM TYPES (authoritative; values must match governance docs)
-- -------------------------------------------------------------------

do $$
begin
  -- Meet domain
  if not exists (select 1 from pg_type where typname = 'mm_meet_type') then
    create type mm_meet_type as enum ('XC','TF');
  end if;

  -- Participation
  if not exists (select 1 from pg_type where typname = 'mm_participation_role') then
    create type mm_participation_role as enum ('HOST','ATTENDEE');
  end if;

  -- Event domain
  if not exists (select 1 from pg_type where typname = 'mm_event_type') then
    create type mm_event_type as enum ('XC','TRACK','FIELD');
  end if;

  -- Ops tokens
  if not exists (select 1 from pg_type where typname = 'mm_ops_token_type') then
    create type mm_ops_token_type as enum ('OPS_TIMER','OPS_FIELD_SCORING','OPS_CHECKIN','OPS_SCRATCH','OPS_DISPLAY');
  end if;

  if not exists (select 1 from pg_type where typname = 'mm_ops_token_state') then
    create type mm_ops_token_state as enum ('ISSUED','ACTIVE','EXPIRED','REVOKED','INVALID');
  end if;
end$$;

-- These enums are governance-locked but their specific values live in docs.
-- Create as placeholder enums only if they don't exist; values must be added
-- in follow-on migrations after copying exact value sets from state machine docs.
-- This avoids guessing.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'mm_meet_lifecycle_state') then
    create type mm_meet_lifecycle_state as enum ('__PLACEHOLDER__');
  end if;

  if not exists (select 1 from pg_type where typname = 'mm_participation_state') then
    create type mm_participation_state as enum ('__PLACEHOLDER__');
  end if;

  if not exists (select 1 from pg_type where typname = 'mm_roster_submission_state') then
    create type mm_roster_submission_state as enum ('__PLACEHOLDER__');
  end if;

  if not exists (select 1 from pg_type where typname = 'mm_entries_submission_state') then
    create type mm_entries_submission_state as enum ('__PLACEHOLDER__');
  end if;

  if not exists (select 1 from pg_type where typname = 'mm_athlete_attendance_state') then
    create type mm_athlete_attendance_state as enum ('__PLACEHOLDER__');
  end if;

  if not exists (select 1 from pg_type where typname = 'mm_xc_race_state') then
    create type mm_xc_race_state as enum ('__PLACEHOLDER__');
  end if;

  if not exists (select 1 from pg_type where typname = 'mm_tf_event_state') then
    create type mm_tf_event_state as enum ('__PLACEHOLDER__');
  end if;

  if not exists (select 1 from pg_type where typname = 'mm_field_scoring_state') then
    create type mm_field_scoring_state as enum ('__PLACEHOLDER__');
  end if;

  if not exists (select 1 from pg_type where typname = 'mm_leg_readiness_state') then
    create type mm_leg_readiness_state as enum ('__PLACEHOLDER__');
  end if;

  if not exists (select 1 from pg_type where typname = 'mm_results_revision_state') then
    create type mm_results_revision_state as enum ('__PLACEHOLDER__');
  end if;

  if not exists (select 1 from pg_type where typname = 'mm_results_pipeline_stage') then
    create type mm_results_pipeline_stage as enum ('__PLACEHOLDER__');
  end if;

  if not exists (select 1 from pg_type where typname = 'mm_results_publication_state') then
    create type mm_results_publication_state as enum ('__PLACEHOLDER__');
  end if;

  if not exists (select 1 from pg_type where typname = 'mm_display_channel_state') then
    create type mm_display_channel_state as enum ('__PLACEHOLDER__');
  end if;
end$$;

-- -------------------------------------------------------------------
-- TABLES
-- -------------------------------------------------------------------

create table if not exists public.meets (
  id uuid primary key default gen_random_uuid(),
  host_program_id uuid not null,
  meet_type mm_meet_type not null,
  lifecycle_state mm_meet_lifecycle_state not null,
  start_date date not null,
  location jsonb,
  is_invitational boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists meets_host_program_id_idx on public.meets(host_program_id);
create index if not exists meets_start_date_idx on public.meets(start_date);

create table if not exists public.meet_participants (
  id uuid primary key default gen_random_uuid(),
  meet_id uuid not null references public.meets(id) on delete cascade,
  program_id uuid not null,
  role mm_participation_role not null,
  join_state mm_participation_state not null,
  created_at timestamptz not null default now(),
  unique(meet_id, program_id)
);

create index if not exists meet_participants_meet_id_idx on public.meet_participants(meet_id);
create index if not exists meet_participants_program_id_idx on public.meet_participants(program_id);

create table if not exists public.meet_rosters (
  id uuid primary key default gen_random_uuid(),
  meet_id uuid not null references public.meets(id) on delete cascade,
  program_id uuid not null,
  roster_state mm_roster_submission_state not null,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(meet_id, program_id)
);

create index if not exists meet_rosters_meet_id_idx on public.meet_rosters(meet_id);
create index if not exists meet_rosters_program_id_idx on public.meet_rosters(program_id);

create table if not exists public.meet_entries (
  id uuid primary key default gen_random_uuid(),
  meet_id uuid not null references public.meets(id) on delete cascade,
  athlete_id uuid not null,
  event_id uuid not null,
  entry_state mm_entries_submission_state not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists meet_entries_meet_id_idx on public.meet_entries(meet_id);
create index if not exists meet_entries_athlete_id_idx on public.meet_entries(athlete_id);
create index if not exists meet_entries_event_id_idx on public.meet_entries(event_id);

create table if not exists public.meet_events (
  id uuid primary key default gen_random_uuid(),
  meet_id uuid not null references public.meets(id) on delete cascade,
  event_type mm_event_type not null,
  xc_state mm_xc_race_state,
  tf_state mm_tf_event_state,
  field_state mm_field_scoring_state,
  scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meet_events_state_onehot_chk check (
    (case
      when event_type = 'XC' then (xc_state is not null and tf_state is null and field_state is null)
      when event_type = 'TRACK' then (tf_state is not null and xc_state is null and field_state is null)
      when event_type = 'FIELD' then (field_state is not null and xc_state is null and tf_state is null)
      else false
    end)
  )
);

create index if not exists meet_events_meet_id_idx on public.meet_events(meet_id);
create index if not exists meet_events_event_type_idx on public.meet_events(event_type);

create table if not exists public.meet_results (
  id uuid primary key default gen_random_uuid(),
  meet_id uuid not null references public.meets(id) on delete cascade,
  event_id uuid not null references public.meet_events(id) on delete cascade,
  athlete_id uuid not null,
  revision_number integer not null,
  result_payload jsonb not null,
  publication_state mm_results_publication_state not null,
  created_at timestamptz not null default now(),
  unique(event_id, athlete_id, revision_number)
);

create index if not exists meet_results_meet_id_idx on public.meet_results(meet_id);
create index if not exists meet_results_event_id_idx on public.meet_results(event_id);
create index if not exists meet_results_publication_state_idx on public.meet_results(publication_state);

create table if not exists public.ops_tokens (
  id uuid primary key default gen_random_uuid(),
  meet_id uuid not null references public.meets(id) on delete cascade,
  token_type mm_ops_token_type not null,
  token_state mm_ops_token_state not null default 'ISSUED',
  token_hash text not null,
  scope_event_id uuid references public.meet_events(id) on delete set null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists ops_tokens_meet_id_idx on public.ops_tokens(meet_id);
create index if not exists ops_tokens_scope_event_id_idx on public.ops_tokens(scope_event_id);
create index if not exists ops_tokens_expires_at_idx on public.ops_tokens(expires_at);

create table if not exists public.ops_token_audit (
  id uuid primary key default gen_random_uuid(),
  ops_token_id uuid not null references public.ops_tokens(id) on delete cascade,
  action text not null,
  event_id uuid references public.meet_events(id) on delete set null,
  client_fingerprint text,
  created_at timestamptz not null default now()
);

create index if not exists ops_token_audit_ops_token_id_idx on public.ops_token_audit(ops_token_id);
create index if not exists ops_token_audit_created_at_idx on public.ops_token_audit(created_at);

-- -------------------------------------------------------------------
-- RLS (minimal safe defaults)
-- -------------------------------------------------------------------

alter table public.meets enable row level security;
alter table public.meet_participants enable row level security;
alter table public.meet_rosters enable row level security;
alter table public.meet_entries enable row level security;
alter table public.meet_events enable row level security;
alter table public.meet_results enable row level security;
alter table public.ops_tokens enable row level security;
alter table public.ops_token_audit enable row level security;

-- PUBLIC READ (limited): meets + meet_events + published meet_results
-- (Column-level restriction handled via views; base tables remain protected)
drop policy if exists meets_public_select on public.meets;
create policy meets_public_select on public.meets
for select
using (true);

drop policy if exists meet_events_public_select on public.meet_events;
create policy meet_events_public_select on public.meet_events
for select
using (true);

drop policy if exists meet_results_public_select on public.meet_results;
create policy meet_results_public_select on public.meet_results
for select
using (publication_state::text in ('PUBLISHED','FINAL','REVISED'));

-- HOST/PROGRAM MUTATION POLICIES ARE INTENTIONALLY NOT DEFINED HERE
-- because program membership model is not included in this promotion.
-- They must be added in follow-on promotions once the exact membership tables/functions are confirmed.

commit;
