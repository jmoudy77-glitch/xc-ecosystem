-- Runtime Creation Engine — Core DB Surfaces
-- Creates: runtimes, runtime_events, runtime_charters, runtime_authority_surfaces, runtime_partitions
-- Adds: invariants + guard triggers (immutability, monotonic time, hash-chain continuity)
-- Notes:
--   • RLS is enabled with no public policies (service_role bypasses RLS).
--   • If you need interactive SQL reads as authenticated, we can add explicit read policies later.

begin;

create extension if not exists pgcrypto;

-- ----------------------------
-- 0) Enums (tight constraints)
-- ----------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'runtime_status') then
    create type public.runtime_status as enum ('forging', 'sealed', 'closed');
  end if;

  if not exists (select 1 from pg_type where typname = 'runtime_partition_type') then
    create type public.runtime_partition_type as enum ('team', 'athlete', 'event_group', 'other');
  end if;

  if not exists (select 1 from pg_type where typname = 'runtime_charter_status') then
    create type public.runtime_charter_status as enum ('submitted', 'accepted', 'rejected', 'forged');
  end if;

  if not exists (select 1 from pg_type where typname = 'runtime_scope_type') then
    create type public.runtime_scope_type as enum ('runtime', 'partition', 'entity');
  end if;
end $$;

-- ----------------------------
-- 1) runtimes (registry)
-- ----------------------------
create table if not exists public.runtimes (
  id uuid primary key default gen_random_uuid(),
  runtime_type text not null,                     -- e.g., 'genesis', 'performance_season'
  parent_runtime_id uuid null references public.runtimes(id) on delete restrict,
  status public.runtime_status not null default 'forging',
  created_at timestamptz not null default now(),
  sealed_at timestamptz null,
  closed_at timestamptz null,
  temporal_origin timestamptz not null default now(),
  temporal_scope jsonb not null default '{}'::jsonb, -- season bounds, etc.
  metadata jsonb not null default '{}'::jsonb
);

-- Exactly one Genesis runtime
create unique index if not exists runtimes_one_genesis_ux
  on public.runtimes (runtime_type)
  where runtime_type = 'genesis';

-- Non-genesis must have a parent
create or replace function public.trg_runtimes_parent_guard()
returns trigger language plpgsql as $$
begin
  if new.runtime_type <> 'genesis' and new.parent_runtime_id is null then
    raise exception 'Non-genesis runtimes must declare parent_runtime_id (Genesis).';
  end if;

  if new.runtime_type = 'genesis' and new.parent_runtime_id is not null then
    raise exception 'Genesis runtime may not declare parent_runtime_id.';
  end if;

  -- Status transition constraints enforced on UPDATE
  if tg_op = 'UPDATE' then
    if old.status = 'forging' and new.status not in ('forging','sealed') then
      raise exception 'Invalid status transition from forging to %', new.status;
    end if;

    if old.status = 'sealed' and new.status not in ('sealed','closed') then
      raise exception 'Invalid status transition from sealed to %', new.status;
    end if;

    if old.status = 'closed' and new.status <> 'closed' then
      raise exception 'Closed runtime is final.';
    end if;

    if old.status = 'forging' and new.status = 'sealed' and new.sealed_at is null then
      new.sealed_at := now();
    end if;

    if old.status <> 'closed' and new.status = 'closed' and new.closed_at is null then
      new.closed_at := now();
    end if;
  end if;

  return new;
end $$;

drop trigger if exists runtimes_parent_guard on public.runtimes;
create trigger runtimes_parent_guard
before insert or update on public.runtimes
for each row execute function public.trg_runtimes_parent_guard();

-- ----------------------------
-- 2) runtime_events (ledger)
-- ----------------------------
create table if not exists public.runtime_events (
  event_id uuid primary key default gen_random_uuid(),
  runtime_id uuid not null references public.runtimes(id) on delete restrict,

  -- lineage
  parent_runtime_id uuid null references public.runtimes(id) on delete restrict,
  cause_event_id uuid null references public.runtime_events(event_id) on delete restrict,

  -- time
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default now(),

  -- attribution
  actor_type text not null,
  actor_id uuid not null,

  -- scope
  scope_type public.runtime_scope_type not null,
  scope_id uuid not null,

  -- type + payload
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,

  -- integrity
  prev_hash text null,
  hash text not null
);

create index if not exists runtime_events_runtime_time_ix
  on public.runtime_events (runtime_id, occurred_at, recorded_at);

create index if not exists runtime_events_type_ix
  on public.runtime_events (event_type);

create index if not exists runtime_events_runtime_prevhash_ix
  on public.runtime_events (runtime_id, prev_hash);

-- Allowlist enforcement (constitutional minimum)
create or replace function public.trg_runtime_events_type_allowlist()
returns trigger language plpgsql as $$
begin
  if new.event_type not in (
    'genesis.create',
    'runtime.charter.submit',
    'runtime.charter.accept',
    'runtime.charter.reject',
    'runtime.forge',
    'runtime.forge.anchor',
    'runtime.seal',
    'runtime.close',
    'runtime.authority.install',
    'runtime.partition.install',
    'runtime.entity.seed',
    'runtime.integrity.alert'
  ) then
    raise exception 'event_type not allowlisted: %', new.event_type;
  end if;

  return new;
end $$;

drop trigger if exists runtime_events_type_allowlist on public.runtime_events;
create trigger runtime_events_type_allowlist
before insert on public.runtime_events
for each row execute function public.trg_runtime_events_type_allowlist();

-- Immutability guard: forbid UPDATE/DELETE
create or replace function public.trg_runtime_events_immutable()
returns trigger language plpgsql as $$
begin
  raise exception 'runtime_events are immutable (no % permitted).', tg_op;
end $$;

drop trigger if exists runtime_events_no_update on public.runtime_events;
create trigger runtime_events_no_update
before update on public.runtime_events
for each row execute function public.trg_runtime_events_immutable();

drop trigger if exists runtime_events_no_delete on public.runtime_events;
create trigger runtime_events_no_delete
before delete on public.runtime_events
for each row execute function public.trg_runtime_events_immutable();

-- Monotonic time + hash-chain continuity guard
create or replace function public.trg_runtime_events_chain_guard()
returns trigger language plpgsql as $$
declare
  last_event record;
begin
  -- Genesis first-event law: prev_hash/cause_event_id may be null only if this is first ledger event
  select event_id, occurred_at, hash
    into last_event
  from public.runtime_events
  where runtime_id = new.runtime_id
  order by occurred_at desc, recorded_at desc
  limit 1;

  if last_event.event_id is null then
    -- first event in this runtime ledger
    if new.prev_hash is not null then
      raise exception 'First ledger event must have prev_hash = null.';
    end if;
  else
    -- monotonic occurred_at (strictly increasing)
    if new.occurred_at <= last_event.occurred_at then
      raise exception 'occurred_at must be strictly increasing per runtime_id. last=% new=%', last_event.occurred_at, new.occurred_at;
    end if;

    -- prev_hash must match last hash
    if new.prev_hash is distinct from last_event.hash then
      raise exception 'prev_hash does not match last hash for runtime ledger continuity.';
    end if;
  end if;

  return new;
end $$;

drop trigger if exists runtime_events_chain_guard on public.runtime_events;
create trigger runtime_events_chain_guard
before insert on public.runtime_events
for each row execute function public.trg_runtime_events_chain_guard();

-- ----------------------------
-- 3) runtime_charters (intent surface)
-- ----------------------------
create table if not exists public.runtime_charters (
  id uuid primary key default gen_random_uuid(),
  parent_runtime_id uuid not null references public.runtimes(id) on delete restrict,
  runtime_type text not null,
  temporal_scope jsonb not null default '{}'::jsonb,
  identity_seeds jsonb not null default '{}'::jsonb,
  requested_authorities jsonb not null default '{}'::jsonb,
  submitted_by_actor_type text not null,
  submitted_by_actor_id uuid not null,
  submitted_at timestamptz not null default now(),
  status public.runtime_charter_status not null default 'submitted',
  decision_event_id uuid null references public.runtime_events(event_id) on delete restrict
);

create index if not exists runtime_charters_parent_ix
  on public.runtime_charters (parent_runtime_id, submitted_at desc);

-- Accepted charters immutable (no edits after acceptance)
create or replace function public.trg_runtime_charters_immutability()
returns trigger language plpgsql as $$
begin
  if old.status in ('accepted','rejected','forged') then
    raise exception 'runtime_charters are immutable after decision (status=%).', old.status;
  end if;
  return new;
end $$;

drop trigger if exists runtime_charters_guard on public.runtime_charters;
create trigger runtime_charters_guard
before update on public.runtime_charters
for each row execute function public.trg_runtime_charters_immutability();

-- ----------------------------
-- 4) runtime_authority_surfaces (registry)
-- ----------------------------
create table if not exists public.runtime_authority_surfaces (
  id uuid primary key default gen_random_uuid(),
  runtime_id uuid not null references public.runtimes(id) on delete restrict,
  authority_class text not null,
  principal_id uuid not null,
  scope jsonb not null default '{}'::jsonb,
  permissions jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active','suspended','revoked')),
  installed_by_event_id uuid not null references public.runtime_events(event_id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists runtime_authority_runtime_ix
  on public.runtime_authority_surfaces (runtime_id, authority_class, principal_id);

-- ----------------------------
-- 5) runtime_partitions (registry)
-- ----------------------------
create table if not exists public.runtime_partitions (
  id uuid primary key default gen_random_uuid(),
  runtime_id uuid not null references public.runtimes(id) on delete restrict,
  partition_type public.runtime_partition_type not null,
  partition_key text not null,
  status text not null default 'active' check (status in ('active','retired')),
  installed_by_event_id uuid not null references public.runtime_events(event_id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (runtime_id, partition_type, partition_key)
);

create index if not exists runtime_partitions_runtime_ix
  on public.runtime_partitions (runtime_id, partition_type);

-- ----------------------------
-- 6) RLS enablement (service_role operates; no client policies yet)
-- ----------------------------
alter table public.runtimes enable row level security;
alter table public.runtime_events enable row level security;
alter table public.runtime_charters enable row level security;
alter table public.runtime_authority_surfaces enable row level security;
alter table public.runtime_partitions enable row level security;

commit;
