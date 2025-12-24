-- supabase/migrations/20251222231500_performance_module_v1_backfill_program_athletes.sql
-- Performance Module v1 — Backfill program_athletes from roster/performance history
-- Purpose: ensure program-authoritative athlete scoping exists for Performance primes APIs.
-- Strategy:
--   1) Insert from team_roster (strongest signal of program ownership)
--   2) Insert from athlete_performances.source_program_id (fallback for legacy data)
-- Idempotent: ON CONFLICT DO NOTHING against (program_id, athlete_id) unique constraint.

begin;

-- 1) From roster (preferred)
insert into public.program_athletes (
  program_id,
  athlete_id,
  relationship_type,
  status,
  source,
  created_at,
  updated_at
)
select
  tr.program_id,
  tr.athlete_id,
  'roster',                          -- relationship_type (or use 'recruit' if you prefer)
  'active',                          -- status (optional semantics; can be null if you want)
  'backfill:team_roster',            -- source
  now(),
  now()
from public.team_roster tr
where tr.program_id is not null
  and tr.athlete_id is not null
on conflict (program_id, athlete_id) do nothing;

-- 2) From performance history (fallback)
insert into public.program_athletes (
  program_id,
  athlete_id,
  relationship_type,
  status,
  source,
  created_at,
  updated_at
)
select
  ap.source_program_id as program_id,
  ap.athlete_id,
  'recruit',                         -- keep generic; roster linkage will override semantics in UI later
  'active',
  'backfill:athlete_performances',
  now(),
  now()
from public.athlete_performances ap
where ap.source_program_id is not null
  and ap.athlete_id is not null
on conflict (program_id, athlete_id) do nothing;

commit;