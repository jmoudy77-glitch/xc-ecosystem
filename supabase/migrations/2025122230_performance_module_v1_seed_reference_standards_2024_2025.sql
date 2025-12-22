-- Performance Module v1 (Intel-Prime) — Seed: Reference Standards (Placeholder)
-- File: supabase/migrations/20251222_performance_module_v1_seed_reference_standards_2024_2025.sql
--
-- Purpose:
--   Seed a placeholder frozen standards set for academic year 2024-2025 so the compute pipeline can run end-to-end
--   without external data import.
--
-- IMPORTANT:
--   This is intentionally minimal and should be replaced/expanded with real governing-body data.
--   Replacements should be performed by introducing a NEW reference set (new set_code) rather than mutating
--   historical sets, unless explicitly correcting a data-entry mistake (audited).

--------------------------------------------------------------------------------
-- 1) Create / upsert reference set (placeholder)
--------------------------------------------------------------------------------

insert into public.performance_reference_sets (set_code, label, academic_year, source_meta, is_active)
values (
  'gb_standards_2024_2025',
  'Governing-Body Standards 2024-2025 (Placeholder)',
  '2024-2025',
  '{
    "type": "governing_body_standards",
    "frozen": true,
    "notes": "Placeholder seed so compute can run. Replace with authoritative rows when available.",
    "provenance": {
      "import_method": "seed",
      "source_url": null,
      "published_at": null
    }
  }'::jsonb,
  true
)
on conflict (set_code) do update
set label = excluded.label,
    academic_year = excluded.academic_year,
    source_meta = excluded.source_meta,
    is_active = excluded.is_active;

--------------------------------------------------------------------------------
-- 2) Seed a minimal set of standards rows
--
-- Notes:
--   - Use event_codes that are known to exist in your dev seed (currently: TFR_M_1500M).
--   - Additional rows can be added as your event catalog expands.
--------------------------------------------------------------------------------

with ref as (
  select id from public.performance_reference_sets where set_code = 'gb_standards_2024_2025'
)
insert into public.performance_reference_standards (
  set_id, event_code, gender, level, reference_mark_seconds, measurement_unit, notes
)
select
  ref.id,
  v.event_code,
  v.gender,
  v.level,
  v.reference_mark_seconds,
  v.measurement_unit,
  v.notes
from ref
join (
  values
    -- Example timed standard: Men's 1500m
    ('TFR_M_1500M','male',null, 240.00::numeric,'seconds','Placeholder reference: 4:00.00 for 1500m')
) as v(event_code, gender, level, reference_mark_seconds, measurement_unit, notes)
  on true
on conflict do nothing;

--------------------------------------------------------------------------------
-- 3) Seed annual Prime ruleset that references this frozen standards set
--------------------------------------------------------------------------------

insert into public.performance_prime_rulesets (ruleset_code, formula_spec_json, is_active)
values (
  'performance_prime_v1_2024_2025',
  ('{
    "version": "v1",
    "academic_year": "2024-2025",
    "name": "Performance Prime (2024-2025)",
    "deterministic": true,
    "reference_set_code": "gb_standards_2024_2025",
    "notes": "Annual frozen ruleset. Math is deterministic and references a frozen standards set. Placeholder formula until finalized.",
    "event_normalization": {
      "mappings": []
    },
    "reference_lookup": {
      "table": "performance_reference_standards",
      "key": ["event_code","gender"],
      "on_missing": "skip_with_audit"
    },
    "index_formula": {
      "description": "Placeholder: normalized_index = (reference_mark_seconds / canonical_mark_seconds) * 100. Replace with final explicit math.",
      "expression": "(ref_seconds / mark_seconds) * 100",
      "timed": true,
      "field": false
    },
    "fingerprinting": {
      "method": "sha256",
      "fields": [
        "athlete_id",
        "event_code",
        "mark_seconds",
        "mark_value",
        "performance_date",
        "performance_type",
        "timing_method",
        "reference_set_code"
      ]
    }
  }')::jsonb,
  true
)
on conflict (ruleset_code) do update
set formula_spec_json = excluded.formula_spec_json,
    is_active = excluded.is_active;

