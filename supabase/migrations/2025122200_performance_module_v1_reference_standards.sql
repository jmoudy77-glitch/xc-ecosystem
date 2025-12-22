-- Performance Module v1 (Intel-Prime) — Governing-Body Reference Standards (Frozen, Versioned)
-- File: supabase/migrations/20251222_performance_module_v1_reference_standards.sql
--
-- Purpose:
--   Provide immutable, versioned reference marks (standards) that Prime math can reference deterministically.
--   These are NOT dynamic lookups; each academic-year snapshot becomes a frozen reference set.
--
-- Contract alignment:
--   - Deterministic: compute reads fixed reference rows; no live external dependency.
--   - Explainable: every normalized index can point to a specific reference row.
--   - Versioned: reference sets are identified by set_code (e.g., gb_standards_2024_2025).
--   - Auditable: reference metadata stored alongside the set.

--------------------------------------------------------------------------------
-- Reference sets (frozen snapshots)
--------------------------------------------------------------------------------

create table if not exists public.performance_reference_sets (
  id uuid primary key default gen_random_uuid(),
  set_code text not null unique,                 -- e.g., gb_standards_2024_2025
  label text not null,
  academic_year text,                            -- e.g., 2024-2025 (optional but recommended)
  source_meta jsonb not null default '{}'::jsonb, -- governing body, URLs, notes, etc.
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_perf_ref_sets_active
  on public.performance_reference_sets(is_active, created_at desc);

--------------------------------------------------------------------------------
-- Reference standards (event-level thresholds) — tied to a reference set
--------------------------------------------------------------------------------

create table if not exists public.performance_reference_standards (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null,

  -- event identity (kept flexible in v1 to avoid failures if event catalogs evolve)
  event_code text not null,
  gender text,                                   -- optional (male/female/coed) depending on sport
  level text,                                    -- optional (conference/regional/national/etc.)

  -- reference marks (exactly one of these should be present)
  reference_mark_seconds numeric,
  reference_mark_value numeric,
  measurement_unit text,                         -- seconds/meters/feet/etc. (informational)

  -- metadata
  notes text,
  created_at timestamptz not null default now(),

  constraint performance_reference_standards_set_fkey
    foreign key (set_id) references public.performance_reference_sets(id) on delete cascade,

  constraint performance_reference_standards_requires_mark
    check (reference_mark_seconds is not null or reference_mark_value is not null)
);

create unique index if not exists performance_reference_standards_unique_idx
  on public.performance_reference_standards (
    set_id,
    event_code,
    coalesce(gender, ''),
    coalesce(level, '')
  );

create index if not exists idx_perf_ref_standards_lookup
  on public.performance_reference_standards(set_id, event_code);

create index if not exists idx_perf_ref_standards_event
  on public.performance_reference_standards(event_code);
