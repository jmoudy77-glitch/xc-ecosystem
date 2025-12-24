-- Performance Module v1 — Expand placeholder governing-body reference standards (2024–2025)
-- Migration: add a broader placeholder set of event reference marks for Prime v1.
--
-- NOTE:
-- - These values are intentionally marked as PLACEHOLDER and are NOT authoritative.
-- - The purpose is to enable end-to-end compute + UI development with deterministic math.
-- - Replace later by inserting an authoritative frozen set and activating its ruleset.
--
-- Idempotency strategy:
-- - For the placeholder set_code below, we delete and re-insert the placeholder rows.
--   This avoids needing an ON CONFLICT clause for an expression-based unique index.

begin;

-- Ensure the reference set exists (should already be created by seed migration)
insert into public.performance_reference_sets (set_code, label, academic_year, source_meta, is_active)
select
  'gb_standards_2024_2025',
  'Governing-Body Standards (PLACEHOLDER) — 2024–2025',
  '2024-2025',
  jsonb_build_object(
    'status','placeholder',
    'notes','Seeded placeholder marks for dev/test. Replace with authoritative standards before production.',
    'created_for','Prime v1 deterministic normalization'
  ),
  true
where not exists (
  select 1 from public.performance_reference_sets where set_code = 'gb_standards_2024_2025'
);

-- Clear existing placeholder rows (if re-running locally)
delete from public.performance_reference_standards
where set_id = (select id from public.performance_reference_sets where set_code = 'gb_standards_2024_2025');

-- Insert a broad placeholder set of common T&F + XC event codes.
-- Convention:
-- - Timed events use reference_mark_seconds.
-- - Field events use reference_mark_value and measurement_unit.
-- - gender/level are NULL in placeholder v1 to keep matching simple.

with s as (
  select id as set_id from public.performance_reference_sets where set_code = 'gb_standards_2024_2025'
)
insert into public.performance_reference_standards (
  set_id, event_code, gender, level,
  reference_mark_seconds, reference_mark_value, measurement_unit,
  notes
)
select * from (
  values
  -- Distance / middle distance (seconds)
  ((select set_id from s), '400m',  null, null, 48.00,  null, 'seconds', 'PLACEHOLDER'),
  ((select set_id from s), '800m',  null, null, 110.00, null, 'seconds', 'PLACEHOLDER'),
  ((select set_id from s), '1000m', null, null, 145.00, null, 'seconds', 'PLACEHOLDER'),
  ((select set_id from s), '1500m', null, null, 230.00, null, 'seconds', 'PLACEHOLDER'),
  ((select set_id from s), '1600m', null, null, 250.00, null, 'seconds', 'PLACEHOLDER'),
  ((select set_id from s), 'Mile',  null, null, 255.00, null, 'seconds', 'PLACEHOLDER'),
  ((select set_id from s), '3000m', null, null, 520.00, null, 'seconds', 'PLACEHOLDER'),
  ((select set_id from s), '3200m', null, null, 560.00, null, 'seconds', 'PLACEHOLDER'),
  ((select set_id from s), '5000m', null, null, 900.00, null, 'seconds', 'PLACEHOLDER'),
  ((select set_id from s), '10000m',null, null, 1900.00,null, 'seconds', 'PLACEHOLDER'),
  ((select set_id from s), 'XC5K',  null, null, 900.00, null, 'seconds', 'PLACEHOLDER'),
  ((select set_id from s), 'XC8K',  null, null, 1500.00,null, 'seconds', 'PLACEHOLDER'),
  ((select set_id from s), 'XC10K', null, null, 1900.00,null, 'seconds', 'PLACEHOLDER'),

  -- Sprints (seconds)
  ((select set_id from s), '60m',   null, null, 6.80,  null, 'seconds', 'PLACEHOLDER'),
  ((select set_id from s), '100m',  null, null, 10.60, null, 'seconds', 'PLACEHOLDER'),
  ((select set_id from s), '200m',  null, null, 21.50, null, 'seconds', 'PLACEHOLDER'),

  -- Hurdles (seconds)
  ((select set_id from s), '110H',  null, null, 14.20, null, 'seconds', 'PLACEHOLDER'),
  ((select set_id from s), '100H',  null, null, 14.80, null, 'seconds', 'PLACEHOLDER'),
  ((select set_id from s), '300H',  null, null, 38.50, null, 'seconds', 'PLACEHOLDER'),
  ((select set_id from s), '400H',  null, null, 53.50, null, 'seconds', 'PLACEHOLDER'),

  -- Steeple (seconds)
  ((select set_id from s), '3000SC',null, null, 560.00, null, 'seconds', 'PLACEHOLDER'),

  -- Relays (seconds)
  ((select set_id from s), '4x100', null, null, 41.50, null, 'seconds', 'PLACEHOLDER'),
  ((select set_id from s), '4x200', null, null, 85.00, null, 'seconds', 'PLACEHOLDER'),
  ((select set_id from s), '4x400', null, null, 190.00,null, 'seconds', 'PLACEHOLDER'),
  ((select set_id from s), '4x800', null, null, 460.00,null, 'seconds', 'PLACEHOLDER'),

  -- Field events (values + units)
  ((select set_id from s), 'LJ', null, null, null, 7.20, 'meters', 'PLACEHOLDER'),
  ((select set_id from s), 'TJ', null, null, null, 14.80,'meters', 'PLACEHOLDER'),
  ((select set_id from s), 'HJ', null, null, null, 2.10, 'meters', 'PLACEHOLDER'),
  ((select set_id from s), 'PV', null, null, null, 5.00, 'meters', 'PLACEHOLDER'),
  ((select set_id from s), 'SP', null, null, null, 17.50,'meters', 'PLACEHOLDER'),
  ((select set_id from s), 'DT', null, null, null, 55.00,'meters', 'PLACEHOLDER'),
  ((select set_id from s), 'HT', null, null, null, 68.00,'meters', 'PLACEHOLDER'),
  ((select set_id from s), 'JT', null, null, null, 68.00,'meters', 'PLACEHOLDER')
) v(set_id, event_code, gender, level, reference_mark_seconds, reference_mark_value, measurement_unit, notes);

commit;
