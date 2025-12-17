-- Stabilize training spine for API/UI reliability
-- 1) Add program_id to athlete_training_sessions + backfill + enforce NOT NULL + FK
-- 2) Add guardrail CHECK constraints
-- 3) Add high-signal indexes

-- ------------------------------------------------------------
-- 1) athlete_training_sessions.program_id (add → backfill → enforce)
-- ------------------------------------------------------------

ALTER TABLE public.athlete_training_sessions
ADD COLUMN IF NOT EXISTS program_id uuid;

-- Backfill program_id using the most authoritative available source:
-- (A) practice_plan_id -> practice_plans.program_id
-- (B) else team_season_id -> team_seasons.program_id
UPDATE public.athlete_training_sessions ats
SET program_id = COALESCE(pp.program_id, ts.program_id)
FROM public.practice_plans pp
LEFT JOIN public.team_seasons ts
  ON ts.id = ats.team_season_id
WHERE ats.practice_plan_id = pp.id
  AND ats.program_id IS NULL;

-- For rows with no practice_plan_id, try team_season_id directly
UPDATE public.athlete_training_sessions ats
SET program_id = ts.program_id
FROM public.team_seasons ts
WHERE ats.team_season_id = ts.id
  AND ats.program_id IS NULL;

-- Hard stop if anything is still unscoped (prevents “mystery rows”)
DO $$
DECLARE
  missing_count integer;
BEGIN
  SELECT COUNT(*) INTO missing_count
  FROM public.athlete_training_sessions
  WHERE program_id IS NULL;

  IF missing_count > 0 THEN
    RAISE EXCEPTION
      'Migration aborted: % athlete_training_sessions rows still have NULL program_id. Fix data before enforcing NOT NULL.',
      missing_count;
  END IF;
END $$;

-- Enforce non-null after backfill
ALTER TABLE public.athlete_training_sessions
ALTER COLUMN program_id SET NOT NULL;

-- Add FK for scoping integrity (idempotent pattern)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'athlete_training_sessions_program_id_fkey'
  ) THEN
    ALTER TABLE public.athlete_training_sessions
    ADD CONSTRAINT athlete_training_sessions_program_id_fkey
    FOREIGN KEY (program_id) REFERENCES public.programs(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 2) Guardrails (make it hard for the API to create weird rows)
-- ------------------------------------------------------------

-- practice_group_assignments must target exactly one thing:
-- either team_roster_id OR athlete_id (but not both, not neither)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'practice_group_assignments_exactly_one_target_chk'
  ) THEN
    ALTER TABLE public.practice_group_assignments
    ADD CONSTRAINT practice_group_assignments_exactly_one_target_chk
    CHECK ( (team_roster_id IS NOT NULL) <> (athlete_id IS NOT NULL) )
    NOT VALID;
  END IF;
END $$;

ALTER TABLE public.practice_group_assignments
VALIDATE CONSTRAINT practice_group_assignments_exactly_one_target_chk;

-- athlete_training_sessions must have a “what”:
-- template OR workout OR title (prevents orphan sessions)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'athlete_training_sessions_has_what_chk'
  ) THEN
    ALTER TABLE public.athlete_training_sessions
    ADD CONSTRAINT athlete_training_sessions_has_what_chk
    CHECK (
      training_event_template_id IS NOT NULL
      OR workout_id IS NOT NULL
      OR (title IS NOT NULL AND length(trim(title)) > 0)
    )
    NOT VALID;
  END IF;
END $$;

ALTER TABLE public.athlete_training_sessions
VALIDATE CONSTRAINT athlete_training_sessions_has_what_chk;

-- ------------------------------------------------------------
-- 3) Indexes aligned to daily queries (planner + logs + library)
-- ------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_athlete_training_sessions_program_date
  ON public.athlete_training_sessions (program_id, scheduled_date);

CREATE INDEX IF NOT EXISTS idx_athlete_training_sessions_athlete_date
  ON public.athlete_training_sessions (athlete_id, scheduled_date);

CREATE INDEX IF NOT EXISTS idx_practice_plans_program_date
  ON public.practice_plans (program_id, practice_date);

CREATE INDEX IF NOT EXISTS idx_practice_groups_plan
  ON public.practice_groups (practice_plan_id);

CREATE INDEX IF NOT EXISTS idx_workout_steps_workout_step
  ON public.workout_steps (workout_id, step_index);

CREATE INDEX IF NOT EXISTS idx_training_event_templates_program_active
  ON public.training_event_templates (program_id, is_active);