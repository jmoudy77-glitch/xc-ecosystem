-- Seed minimal SYSTEM training exercise catalog (program_id IS NULL)
-- Idempotent: will not duplicate if rerun.

with seed as (
  select *
  from (
    values
      -- RUN (core distances)
      ('100m Run',  'Single 100m rep.',                      'run', 'meters', array['track','sprint']::text[], '{}'::jsonb),
      ('200m Run',  'Single 200m rep.',                      'run', 'meters', array['track','sprint']::text[], '{}'::jsonb),
      ('300m Run',  'Single 300m rep.',                      'run', 'meters', array['track','sprint']::text[], '{}'::jsonb),
      ('400m Run',  'Single 400m rep.',                      'run', 'meters', array['track','interval']::text[], '{}'::jsonb),
      ('600m Run',  'Single 600m rep.',                      'run', 'meters', array['track','interval']::text[], '{}'::jsonb),
      ('800m Run',  'Single 800m rep.',                      'run', 'meters', array['track','interval']::text[], '{}'::jsonb),
      ('1000m Run', 'Single 1000m rep.',                     'run', 'meters', array['track','interval']::text[], '{}'::jsonb),
      ('1200m Run', 'Single 1200m rep.',                     'run', 'meters', array['track','interval']::text[], '{}'::jsonb),
      ('1600m Run', 'Single 1600m rep.',                     'run', 'meters', array['track','distance']::text[], '{}'::jsonb),
      ('Mile Run',  'Single mile rep.',                      'run', 'meters', array['track','distance']::text[], '{}'::jsonb),

      -- RUN (common “types” that become workouts when quantified)
      ('Strides',        'Short relaxed accelerations.',     'run', 'mixed',  array['technique','speed']::text[], '{}'::jsonb),
      ('Tempo Run',      'Sustained aerobic effort.',        'run', 'seconds',array['distance','tempo']::text[], '{}'::jsonb),
      ('Easy Run',       'Conversational aerobic run.',      'run', 'seconds',array['distance','aerobic']::text[], '{}'::jsonb),
      ('Long Run',       'Extended aerobic run.',            'run', 'seconds',array['distance','aerobic']::text[], '{}'::jsonb),
      ('Fartlek',        'Alternating surges and easy.',     'run', 'seconds',array['distance','speed']::text[], '{}'::jsonb),
      ('Hill Repeats',   'Uphill running reps.',             'run', 'reps',   array['strength','speed']::text[], '{}'::jsonb),

      -- GYM (core lifts)
      ('Back Squat',     'Barbell back squat.',              'gym', 'reps',   array['strength']::text[], '{}'::jsonb),
      ('Front Squat',    'Barbell front squat.',             'gym', 'reps',   array['strength']::text[], '{}'::jsonb),
      ('Deadlift',       'Barbell deadlift.',                'gym', 'reps',   array['strength']::text[], '{}'::jsonb),
      ('Bench Press',    'Barbell bench press.',             'gym', 'reps',   array['strength']::text[], '{}'::jsonb),
      ('Overhead Press', 'Standing overhead press.',         'gym', 'reps',   array['strength']::text[], '{}'::jsonb),
      ('Pull-Up',        'Strict pull-up.',                  'gym', 'reps',   array['strength']::text[], '{}'::jsonb),
      ('Core Circuit',   'General core work.',               'gym', 'mixed',  array['core']::text[], '{}'::jsonb),

      -- CROSS TRAINING
      ('Bike',           'Stationary bike / cycling.',       'cross_training', 'seconds', array['aerobic']::text[], '{}'::jsonb),
      ('Swim',           'Swimming workout.',                'cross_training', 'seconds', array['aerobic']::text[], '{}'::jsonb),
      ('Elliptical',     'Elliptical trainer.',              'cross_training', 'seconds', array['aerobic']::text[], '{}'::jsonb)

  ) as v(label, description, workout_category, measurement_unit, tags, metadata)
)

insert into public.training_exercises
  (program_id, label, description, workout_category, measurement_unit, tags, metadata, is_active)
select
  null,
  s.label,
  s.description,
  s.workout_category,
  s.measurement_unit,
  s.tags,
  s.metadata,
  true
from seed s
where not exists (
  select 1
  from public.training_exercises te
  where te.program_id is null
    and lower(te.label) = lower(s.label)
);