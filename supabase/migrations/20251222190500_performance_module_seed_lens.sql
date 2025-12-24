-- supabase/migrations/20251222190500_performance_module_seed_lens.sql
-- Performance Module v1 — Seed performance_lenses for Team Rollups v1
-- Adds lens codes referenced by compute pipeline: season + three_year

insert into public.performance_lenses (
  lens_code,
  subject_type,
  definition_json,
  display_label,
  is_default,
  created_at
)
values
  (
    'season',
    'team_season',
    jsonb_build_object(
      'kind', 'team_season',
      'notes', 'Uses team_seasons date bounds when available.'
    ),
    'Season',
    true,
    now()
  ),
  (
    'three_year',
    'team_window',
    jsonb_build_object(
      'kind', 'rolling_window',
      'window_years', 3,
      'notes', 'Long-range lens (current year + two prior seasons).'
    ),
    'Three-Year Window',
    false,
    now()
  )
on conflict (lens_code) do update
set
  subject_type   = excluded.subject_type,
  definition_json = excluded.definition_json,
  display_label  = excluded.display_label,
  is_default     = excluded.is_default;