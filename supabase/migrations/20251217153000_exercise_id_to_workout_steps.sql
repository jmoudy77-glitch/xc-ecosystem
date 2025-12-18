-- supabase/migrations/20251217153000_exercise_id_to_workout_steps.sql
-- Adds a direct link from workout steps to the new exercise catalog.
-- This keeps "exercise" (capability) separate from "workout" (quantified usage).

BEGIN;

-- 1) Add nullable exercise_id (we'll backfill + enforce later once UI/API are stable)
ALTER TABLE public.workout_steps
ADD COLUMN IF NOT EXISTS exercise_id uuid;

-- 2) FK to training_exercises (program-scoped; global templates can be represented by program_id NULL if desired)
-- Use NOT VALID so existing rows don't block the migration; we'll validate after backfill.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'workout_steps_exercise_id_fkey'
  ) THEN
    ALTER TABLE public.workout_steps
      ADD CONSTRAINT workout_steps_exercise_id_fkey
      FOREIGN KEY (exercise_id)
      REFERENCES public.training_exercises(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END$$;

-- 3) Index for common joins
CREATE INDEX IF NOT EXISTS workout_steps_exercise_id_idx
  ON public.workout_steps(exercise_id);

-- Optional: composite index for rendering a workout with steps in order
CREATE INDEX IF NOT EXISTS workout_steps_workout_id_step_index_idx
  ON public.workout_steps(workout_id, step_index);

-- NOTE: We intentionally do NOT validate the FK here.
-- After we backfill exercise_id for any existing workout_steps, run:
--   ALTER TABLE public.workout_steps VALIDATE CONSTRAINT workout_steps_exercise_id_fkey;

COMMIT;
