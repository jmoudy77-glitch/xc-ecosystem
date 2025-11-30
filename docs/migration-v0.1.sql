
-- migration-v0.1.sql
-- Safe, idempotent migration for the new architecture:
-- schools → programs → dual-level subscriptions → athlete accounts

------------------------------------------------------------
-- 1. Schools Table
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.schools (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text        NOT NULL,
  level        text        NOT NULL,
  country      text,
  state        text,
  city         text,
  postal_code  text,
  short_code   text,
  external_ref text,
  is_claimed   boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

------------------------------------------------------------
-- 2. Programs Table (Teams)
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.programs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    uuid NOT NULL REFERENCES public.schools (id) ON DELETE CASCADE,
  name         text NOT NULL,
  sport        text NOT NULL,
  gender       text,
  level        text,
  season       text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_programs_school_id
  ON public.programs (school_id);

------------------------------------------------------------
-- 3. Program Subscriptions (Coach/Team)
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.program_subscriptions (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id              uuid NOT NULL REFERENCES public.programs (id) ON DELETE CASCADE,
  stripe_customer_id      text,
  stripe_subscription_id  text,
  plan_code               text NOT NULL,
  status                  text NOT NULL,
  current_period_end      timestamptz,
  cancel_at_period_end    boolean NOT NULL DEFAULT false,
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_program_subscriptions_program_sub
  ON public.program_subscriptions (program_id, stripe_subscription_id);

------------------------------------------------------------
-- 4. Athlete Subscriptions (Individual Athlete Billing)
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.athlete_subscriptions (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  stripe_customer_id      text,
  stripe_subscription_id  text,
  plan_code               text NOT NULL,
  status                  text NOT NULL,
  current_period_end      timestamptz,
  cancel_at_period_end    boolean NOT NULL DEFAULT false,
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_athlete_subscriptions_user_sub
  ON public.athlete_subscriptions (user_id, stripe_subscription_id);

------------------------------------------------------------
-- 5. Athletes Table Upgrades
------------------------------------------------------------
ALTER TABLE public.athletes
  ADD COLUMN IF NOT EXISTS user_id uuid UNIQUE REFERENCES public.users (id);

ALTER TABLE public.athletes
  ADD COLUMN IF NOT EXISTS is_claimed boolean NOT NULL DEFAULT false;

ALTER TABLE public.athletes
  ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools (id);

ALTER TABLE public.athletes
  ADD COLUMN IF NOT EXISTS hs_school_name text;

ALTER TABLE public.athletes
  ADD COLUMN IF NOT EXISTS hs_city text;

ALTER TABLE public.athletes
  ADD COLUMN IF NOT EXISTS hs_state text;

ALTER TABLE public.athletes
  ADD COLUMN IF NOT EXISTS hs_country text;

ALTER TABLE public.athletes
  ADD COLUMN IF NOT EXISTS hs_coach_name text;

ALTER TABLE public.athletes
  ADD COLUMN IF NOT EXISTS hs_coach_email text;

ALTER TABLE public.athletes
  ADD COLUMN IF NOT EXISTS hs_coach_phone text;

------------------------------------------------------------
-- 6. Athlete Invite Table
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.athlete_invites (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id    uuid NOT NULL REFERENCES public.athletes (id) ON DELETE CASCADE,
  program_id    uuid NOT NULL REFERENCES public.programs (id) ON DELETE CASCADE,
  email         text NOT NULL,
  invite_token  text NOT NULL UNIQUE,
  status        text NOT NULL DEFAULT 'pending',
  expires_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_athlete_invites_athlete_id
  ON public.athlete_invites (athlete_id);

-- End of migration
