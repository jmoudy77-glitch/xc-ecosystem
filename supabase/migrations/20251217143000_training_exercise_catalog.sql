-- Core Exercise Catalog (atomic exercises, NOT quantified workouts)

create table if not exists public.training_exercises (
  id uuid primary key default gen_random_uuid(),
  program_id uuid null, -- null = system/global exercise
  label text not null,
  description text,
  workout_category text not null check (workout_category in ('run','gym','cross_training','other')),
  measurement_unit text not null check (measurement_unit in ('meters','seconds','reps','mixed','none')),
  tags text[] not null default '{}',
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists training_exercises_program_id_idx
  on public.training_exercises(program_id);

create index if not exists training_exercises_category_idx
  on public.training_exercises(workout_category);

create index if not exists training_exercises_active_idx
  on public.training_exercises(is_active);

-- Link workout templates to a core exercise (nullable for now to avoid breaking existing data)
alter table public.training_event_templates
  add column if not exists exercise_id uuid;

alter table public.training_event_templates
  add constraint training_event_templates_exercise_id_fkey
  foreign key (exercise_id)
  references public.training_exercises(id)
  on delete set null;

create index if not exists training_event_templates_exercise_id_idx
  on public.training_event_templates(exercise_id);

-- Optional: seed a minimal system set of core exercises (safe to run multiple times)
insert into public.training_exercises (program_id, label, workout_category, measurement_unit, tags, description)
select null, '400m Run', 'run', 'meters', array['track','interval'], 'A single 400m running rep.'
where not exists (
  select 1 from public.training_exercises
  where program_id is null and label = '400m Run'
);

insert into public.training_exercises (program_id, label, workout_category, measurement_unit, tags, description)
select null, 'Easy Run', 'run', 'mixed', array['aerobic'], 'Steady aerobic running.'
where not exists (
  select 1 from public.training_exercises
  where program_id is null and label = 'Easy Run'
);

insert into public.training_exercises (program_id, label, workout_category, measurement_unit, tags, description)
select null, 'Back Squat', 'gym', 'reps', array['strength','lower'], 'Barbell back squat.'
where not exists (
  select 1 from public.training_exercises
  where program_id is null and label = 'Back Squat'
);