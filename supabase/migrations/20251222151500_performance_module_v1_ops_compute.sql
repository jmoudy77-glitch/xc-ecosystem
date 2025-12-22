-- Performance Module v1 (Intel-Prime) — Ops: Compute Queue + Run Ledger
-- File: supabase/migrations/20251222_performance_module_v1_ops_compute.sql
--
-- Purpose:
--   Provide deterministic, auditable orchestration for primes/rollups/signals recompute.
--   These tables store operational metadata only (not intelligence).
--
-- Contract alignment:
--   - No silent recompute: changes are queued with explicit reasons.
--   - Auditability: every compute run is logged with scope, versions, and outcomes.

--------------------------------------------------------------------------------
-- Recompute Queue
--------------------------------------------------------------------------------

create table if not exists public.performance_compute_queue (
  id uuid primary key default gen_random_uuid(),

  -- Scope identifies what should be recomputed
  scope_type text not null check (scope_type in ('program','athlete','team_season','team','global')),
  scope_id uuid, -- nullable only for scope_type='global'

  -- Reason is explicit (no silent recompute)
  reason text not null check (reason in (
    'raw_insert',
    'raw_corrected',
    'raw_voided',
    'roster_changed',
    'ruleset_changed',
    'lens_changed',
    'season_boundary',
    'manual_recompute'
  )),

  -- Optional details for deterministic selection (never used as “truth”)
  details_json jsonb not null default '{}'::jsonb,

  -- Processing state
  status text not null default 'queued' check (status in ('queued','processing','done','failed','canceled')),
  attempts integer not null default 0 check (attempts >= 0),
  not_before timestamptz,
  locked_at timestamptz,
  locked_by text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure global scope has null id; and keep updated_at current
create or replace function public._performance_compute_queue_scope_guard()
returns trigger
language plpgsql
as $$
begin
  if (new.scope_type = 'global') then
    new.scope_id := null;
  else
    if new.scope_id is null then
      raise exception 'scope_id is required when scope_type != global';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_performance_compute_queue_scope_guard on public.performance_compute_queue;
create trigger trg_performance_compute_queue_scope_guard
before insert or update on public.performance_compute_queue
for each row execute function public._performance_compute_queue_scope_guard();

create index if not exists idx_perf_compute_queue_status
  on public.performance_compute_queue(status, not_before nulls first, created_at);

create index if not exists idx_perf_compute_queue_scope
  on public.performance_compute_queue(scope_type, scope_id, created_at desc);

--------------------------------------------------------------------------------
-- Compute Run Ledger
--------------------------------------------------------------------------------

create table if not exists public.performance_compute_runs (
  id uuid primary key default gen_random_uuid(),

  queue_id uuid,
  scope_type text not null check (scope_type in ('program','athlete','team_season','team','global')),
  scope_id uuid,

  -- Which compute stages ran (allows partial runs)
  stages jsonb not null default '[]'::jsonb, -- e.g. ["primes","athlete_rollups","team_rollups","signals"]

  -- Version markers for reconstruction
  prime_ruleset_code text,
  signal_ruleset_code text,
  lens_codes text[] default '{}'::text[],

  started_at timestamptz not null default now(),
  finished_at timestamptz,

  status text not null default 'running' check (status in ('running','succeeded','failed','partial')),
  summary_json jsonb not null default '{}'::jsonb,
  error_json jsonb,

  created_at timestamptz not null default now(),

  constraint performance_compute_runs_queue_fkey
    foreign key (queue_id) references public.performance_compute_queue(id) on delete set null
);

create index if not exists idx_perf_compute_runs_scope
  on public.performance_compute_runs(scope_type, scope_id, started_at desc);

create index if not exists idx_perf_compute_runs_status
  on public.performance_compute_runs(status, started_at desc);

--------------------------------------------------------------------------------
-- Optional: Deduplicate queue items (best-effort)
-- Prevents spamming identical work while preserving explicit triggers.
--------------------------------------------------------------------------------

create unique index if not exists uq_perf_compute_queue_dedupe
  on public.performance_compute_queue(scope_type, scope_id, reason)
  where status in ('queued','processing');
