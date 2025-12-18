-- supabase/migrations/20251217164500_seed_global_workout_steps.sql

begin;

-- Seeds Global workout steps for the Global workouts we already inserted.
-- This migration is self-healing: it will create any missing Global training_exercises
-- (program_id IS NULL) needed for the seeded steps.
--
-- Assumptions:
-- - public.training_exercises exists (program_id nullable; program_id NULL == Global)
-- - public.workouts exists (program_id NOT NULL) and Global templates are flagged via is_system_template = true
-- - public.workout_steps has columns: workout_id, step_index, exercise_id, label, parameters_override

do $$
declare
  ex_warmup uuid;
  ex_cooldown uuid;
  ex_easy_run uuid;
  ex_long_run uuid;
  ex_run_100m uuid;
  ex_run_400m uuid;
  ex_jog_recovery uuid;

  w_easy uuid;
  w_long uuid;
  w_strides uuid;
  w_tempo uuid;
  w_intervals uuid;
begin
  /* --------------------------------------------------------------------------
     1) Ensure required Global exercises exist (program_id IS NULL)
     -------------------------------------------------------------------------- */

  -- Warm-up
  select id into ex_warmup
  from public.training_exercises
  where program_id is null and lower(label) in ('warm-up','warmup')
  limit 1;

  if ex_warmup is null then
    insert into public.training_exercises (
      program_id, label, description, workout_category, measurement_unit, tags, metadata
    ) values (
      null,
      'Warm-up',
      'General warm-up: easy movement + drills to prepare for the main work.',
      'run',
      'mixed',
      array['warmup','prep'],
      jsonb_build_object('seeded_global', true)
    )
    returning id into ex_warmup;
  end if;

  -- Cooldown
  select id into ex_cooldown
  from public.training_exercises
  where program_id is null and lower(label) in ('cool-down','cooldown','cool down')
  limit 1;

  if ex_cooldown is null then
    insert into public.training_exercises (
      program_id, label, description, workout_category, measurement_unit, tags, metadata
    ) values (
      null,
      'Cooldown',
      'Easy cooldown to bring the body back down and support recovery.',
      'run',
      'mixed',
      array['cooldown','recovery'],
      jsonb_build_object('seeded_global', true)
    )
    returning id into ex_cooldown;
  end if;

  -- Easy Run
  select id into ex_easy_run
  from public.training_exercises
  where program_id is null and lower(label) in ('easy run','aerobic run')
  limit 1;

  if ex_easy_run is null then
    insert into public.training_exercises (
      program_id, label, description, workout_category, measurement_unit, tags, metadata
    ) values (
      null,
      'Easy Run',
      'Conversational aerobic running. Used for base + recovery days.',
      'run',
      'mixed',
      array['aerobic','base','easy'],
      jsonb_build_object('seeded_global', true)
    )
    returning id into ex_easy_run;
  end if;

  -- Long Run
  select id into ex_long_run
  from public.training_exercises
  where program_id is null and lower(label) = 'long run'
  limit 1;

  if ex_long_run is null then
    insert into public.training_exercises (
      program_id, label, description, workout_category, measurement_unit, tags, metadata
    ) values (
      null,
      'Long Run',
      'Steady aerobic run with extended duration.',
      'run',
      'mixed',
      array['aerobic','long'],
      jsonb_build_object('seeded_global', true)
    )
    returning id into ex_long_run;
  end if;

  -- 100m Run (used for strides)
  select id into ex_run_100m
  from public.training_exercises
  where program_id is null and lower(label) in ('100m run','100 m run','strides','stride')
  limit 1;

  if ex_run_100m is null then
    insert into public.training_exercises (
      program_id, label, description, workout_category, measurement_unit, tags, metadata
    ) values (
      null,
      '100m Run',
      'Short controlled fast running (commonly used as strides).',
      'run',
      'meters',
      array['stride','speed','neuromuscular'],
      jsonb_build_object('seeded_global', true)
    )
    returning id into ex_run_100m;
  end if;

  -- 400m Run
  select id into ex_run_400m
  from public.training_exercises
  where program_id is null and lower(label) in ('400m run','400 m run')
  limit 1;

  if ex_run_400m is null then
    insert into public.training_exercises (
      program_id, label, description, workout_category, measurement_unit, tags, metadata
    ) values (
      null,
      '400m Run',
      'A single 400m repetition (used in interval workouts).',
      'run',
      'meters',
      array['interval','track'],
      jsonb_build_object('seeded_global', true)
    )
    returning id into ex_run_400m;
  end if;

  -- Jog Recovery
  select id into ex_jog_recovery
  from public.training_exercises
  where program_id is null and lower(label) in ('jog recovery','easy jog','recovery jog')
  limit 1;

  if ex_jog_recovery is null then
    insert into public.training_exercises (
      program_id, label, description, workout_category, measurement_unit, tags, metadata
    ) values (
      null,
      'Jog Recovery',
      'Easy jogging between reps/sets for recovery.',
      'run',
      'mixed',
      array['recovery','rest'],
      jsonb_build_object('seeded_global', true)
    )
    returning id into ex_jog_recovery;
  end if;

  /* --------------------------------------------------------------------------
     2) Locate the Global workouts (already seeded elsewhere)
     -------------------------------------------------------------------------- */

  select id into w_easy
  from public.workouts
  where is_system_template = true and label = 'Easy Run (30–45 min)'
  limit 1;

  select id into w_long
  from public.workouts
  where is_system_template = true and label = 'Long Run (60–90 min)'
  limit 1;

  select id into w_strides
  from public.workouts
  where is_system_template = true and label = 'Strides (6–8 x 100m)'
  limit 1;

  select id into w_tempo
  from public.workouts
  where is_system_template = true and label = 'Tempo Intro (20 min)'
  limit 1;

  select id into w_intervals
  from public.workouts
  where is_system_template = true and label = 'Intervals (8 x 400m)'
  limit 1;

  if w_easy is null or w_long is null or w_strides is null or w_tempo is null or w_intervals is null then
    raise exception 'Cannot seed workout_steps: expected Global workouts not found. Seed Global workouts first.';
  end if;

  /* --------------------------------------------------------------------------
     3) Idempotency: if any of these workouts already has steps, skip
     -------------------------------------------------------------------------- */

  if exists (
    select 1
    from public.workout_steps
    where workout_id in (w_easy, w_long, w_strides, w_tempo, w_intervals)
  ) then
    raise notice 'Global workout_steps already exist for at least one seeded workout. Skipping insert.';
    return;
  end if;

  /* --------------------------------------------------------------------------
     4) Seed steps
     -------------------------------------------------------------------------- */

  -- EASY RUN (30–45)
  insert into public.workout_steps (workout_id, step_index, exercise_id, label, parameters_override)
  values
    (w_easy, 1, ex_warmup, 'Warm-up', jsonb_build_object('duration_min', 10, 'intensity', 'easy')),
    (w_easy, 2, ex_easy_run, 'Easy Run', jsonb_build_object('duration_min_min', 30, 'duration_min_max', 45, 'intensity', 'easy', 'target_pace', 'easy')),
    (w_easy, 3, ex_cooldown, 'Cooldown', jsonb_build_object('duration_min', 10, 'intensity', 'easy'));

  -- LONG RUN (60–90)
  insert into public.workout_steps (workout_id, step_index, exercise_id, label, parameters_override)
  values
    (w_long, 1, ex_warmup, 'Warm-up', jsonb_build_object('duration_min', 10, 'intensity', 'easy')),
    (w_long, 2, ex_long_run, 'Long Run', jsonb_build_object('duration_min_min', 60, 'duration_min_max', 90, 'intensity', 'easy', 'target_pace', 'aerobic')),
    (w_long, 3, ex_cooldown, 'Cooldown', jsonb_build_object('duration_min', 10, 'intensity', 'easy'));

  -- STRIDES (6–8 x 100m)
  insert into public.workout_steps (workout_id, step_index, exercise_id, label, parameters_override)
  values
    (w_strides, 1, ex_warmup, 'Warm-up', jsonb_build_object('duration_min', 10, 'intensity', 'easy')),
    (w_strides, 2, ex_run_100m, 'Strides', jsonb_build_object('reps_min', 6, 'reps_max', 8, 'distance_m', 100, 'intensity', 'fast_relaxed', 'rest', 'full')),
    (w_strides, 3, ex_cooldown, 'Cooldown', jsonb_build_object('duration_min', 10, 'intensity', 'easy'));

  -- TEMPO INTRO (20 min continuous)
  insert into public.workout_steps (workout_id, step_index, exercise_id, label, parameters_override)
  values
    (w_tempo, 1, ex_warmup, 'Warm-up', jsonb_build_object('duration_min', 15, 'intensity', 'easy')),
    (w_tempo, 2, ex_easy_run, 'Tempo', jsonb_build_object('duration_min', 20, 'intensity', 'tempo', 'target_pace', 'tempo')),
    (w_tempo, 3, ex_cooldown, 'Cooldown', jsonb_build_object('duration_min', 10, 'intensity', 'easy'));

  -- INTERVALS (8 x 400 w/ equal jog)
  insert into public.workout_steps (workout_id, step_index, exercise_id, label, parameters_override)
  values
    (w_intervals, 1, ex_warmup, 'Warm-up', jsonb_build_object('duration_min', 15, 'intensity', 'easy')),
    (w_intervals, 2, ex_run_400m, '8 x 400m', jsonb_build_object('reps', 8, 'distance_m', 400, 'intensity', 'hard', 'target_pace', '1k')),
    (w_intervals, 3, ex_jog_recovery, 'Recovery Jog', jsonb_build_object('rest_type', 'equal_time_or_distance', 'intensity', 'easy')),
    (w_intervals, 4, ex_cooldown, 'Cooldown', jsonb_build_object('duration_min', 10, 'intensity', 'easy'));

end $$;

commit;