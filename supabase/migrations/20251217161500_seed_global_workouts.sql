-- supabase/migrations/20251217161500_seed_global_workouts.sql
-- Seed beginner-friendly GLOBAL workouts (read-only templates)

begin;

-- NOTE: In this project `workouts.program_id` is NOT NULL.
-- To make “Global” workouts seedable on a fresh local reset (where there may be zero programs),
-- we create a dedicated, stable "Global Templates" program (and its required school) if missing.
-- Global-ness is still expressed by `is_system_template = true` + RLS.

-- Stable IDs so migrations are deterministic and repeatable.
-- (Using a clearly-reserved UUID pattern to avoid collisions.)
-- School: 00000000-0000-0000-0000-000000000001
-- Program: 00000000-0000-0000-0000-000000000002

do $$
begin
  -- Create a dedicated school row if none exists with our stable ID
  if not exists (select 1 from public.schools where id = '00000000-0000-0000-0000-000000000001') then
    insert into public.schools (
      id,
      name,
      level,
      created_at,
      updated_at
    ) values (
      '00000000-0000-0000-0000-000000000001',
      'Global Templates School',
      'system',
      now(),
      now()
    );
  end if;

  -- Create a dedicated program row if none exists with our stable ID
  if not exists (select 1 from public.programs where id = '00000000-0000-0000-0000-000000000002') then
    insert into public.programs (
      id,
      school_id,
      name,
      sport,
      created_at,
      updated_at
    ) values (
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000001',
      'Global Workout Templates',
      'xc',
      now(),
      now()
    );
  end if;
end $$;

-- Seed beginner-friendly GLOBAL workouts.
-- Use ON CONFLICT DO NOTHING to avoid duplicates if migration is re-applied in dev flows.
insert into public.workouts (
  program_id,
  label,
  description,
  is_system_template
)
values
  ('00000000-0000-0000-0000-000000000002', 'Easy Run (30–45 min)', 'Conversational effort. Keep it relaxed. Add 4–6 strides if desired.', true),
  ('00000000-0000-0000-0000-000000000002', 'Long Run (60–90 min)', 'Steady aerobic run. Fuel + hydrate. Keep effort under control.', true),
  ('00000000-0000-0000-0000-000000000002', 'Strides (6–8 x 100m)', 'After warmup or an easy run. Smooth fast, full recovery walk-back.', true),
  ('00000000-0000-0000-0000-000000000002', 'Tempo Intro (20 min)', 'Comfortably hard. Continuous tempo segment; finish feeling controlled.', true),
  ('00000000-0000-0000-0000-000000000002', 'Intervals (8 x 400m)', '400 repeats with equal jog recovery. Start conservative; stay consistent.', true)
on conflict do nothing;

commit;