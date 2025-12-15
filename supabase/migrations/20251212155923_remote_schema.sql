


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."billing_status" AS ENUM (
    'none',
    'active',
    'trialing',
    'past_due',
    'canceled'
);


ALTER TYPE "public"."billing_status" OWNER TO "postgres";


CREATE TYPE "public"."billing_status_enum" AS ENUM (
    'none',
    'active',
    'trialing',
    'past_due',
    'canceled'
);


ALTER TYPE "public"."billing_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."governing_body_enum" AS ENUM (
    'nfhs',
    'ncaa',
    'naia',
    'other'
);


ALTER TYPE "public"."governing_body_enum" OWNER TO "postgres";


CREATE TYPE "public"."heat_risk_level_enum" AS ENUM (
    'low',
    'moderate',
    'high',
    'extreme'
);


ALTER TYPE "public"."heat_risk_level_enum" OWNER TO "postgres";


CREATE TYPE "public"."membership_role" AS ENUM (
    'head_coach',
    'assistant_coach',
    'recruiting_coordinator',
    'analyst'
);


ALTER TYPE "public"."membership_role" OWNER TO "postgres";


CREATE TYPE "public"."subscription_tier" AS ENUM (
    'free',
    'elite',
    'pro'
);


ALTER TYPE "public"."subscription_tier" OWNER TO "postgres";


CREATE TYPE "public"."subscription_tier_enum" AS ENUM (
    'free',
    'elite',
    'pro'
);


ALTER TYPE "public"."subscription_tier_enum" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."athlete_identity_key_strong"("first_name" "text", "last_name" "text", "date_of_birth" "date") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select case
    when date_of_birth is null then null
    else public.identity_sha256_hex(
      public.identity_normalize_name(first_name)
      || '|' ||
      public.identity_normalize_name(last_name)
      || '|' ||
      to_char(date_of_birth, 'YYYY-MM-DD')
    )
  end;
$$;


ALTER FUNCTION "public"."athlete_identity_key_strong"("first_name" "text", "last_name" "text", "date_of_birth" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."athlete_identity_key_weak"("first_name" "text", "last_name" "text", "grad_year" integer) RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select public.identity_sha256_hex(
    public.identity_normalize_name(first_name)
    || '|' ||
    public.identity_normalize_name(last_name)
    || '|' ||
    coalesce(grad_year::text, '')
  );
$$;


ALTER FUNCTION "public"."athlete_identity_key_weak"("first_name" "text", "last_name" "text", "grad_year" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."athlete_set_dob_and_upgrade_identity"("p_athlete_id" "uuid", "p_date_of_birth" "date", "p_actor_user_id" "uuid" DEFAULT NULL::"uuid", "p_program_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_athlete public.athletes%rowtype;
  v_conflict_id uuid;
begin
  select * into v_athlete
  from public.athletes
  where id = p_athlete_id;

  if not found then
    raise exception 'athlete_not_found';
  end if;

  v_conflict_id := public.find_athlete_by_strong_identity(
    v_athlete.first_name,
    v_athlete.last_name,
    p_date_of_birth,
    p_athlete_id
  );

  if v_conflict_id is not null then
    -- log for later side-by-side UX
    insert into public.athlete_identity_events(
      event_type, canonical_athlete_id, source_athlete_id, program_id, actor_user_id, details
    ) values (
      'duplicate_detected',
      v_conflict_id,
      p_athlete_id,
      p_program_id,
      p_actor_user_id,
      jsonb_build_object(
        'reason', 'strong_identity_collision',
        'conflict_athlete_id', v_conflict_id
      )
    );

    -- Raise a targeted error the app can catch and use to render side-by-side
    raise exception 'strong_identity_collision:%', v_conflict_id;
  end if;

  -- Safe to set; trigger will compute identity_key_strong and update confidence
  update public.athletes
  set date_of_birth = p_date_of_birth,
      needs_identity_review = false
  where id = p_athlete_id;

  insert into public.athlete_identity_events(
    event_type, canonical_athlete_id, source_athlete_id, program_id, actor_user_id, details
  ) values (
    'updated',
    p_athlete_id,
    p_athlete_id,
    p_program_id,
    p_actor_user_id,
    jsonb_build_object('updated_fields', array['date_of_birth'])
  );

  return jsonb_build_object(
    'ok', true,
    'athlete_id', p_athlete_id
  );
end;
$$;


ALTER FUNCTION "public"."athlete_set_dob_and_upgrade_identity"("p_athlete_id" "uuid", "p_date_of_birth" "date", "p_actor_user_id" "uuid", "p_program_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."athletes_set_identity_keys_trg"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  -- Always maintain weak identity (coach-friendly)
  new.identity_key_weak :=
    public.athlete_identity_key_weak(new.first_name, new.last_name, new.grad_year);

  -- Strong identity: compute whenever DOB exists.
  -- NOTE: this can raise a unique violation if it collides (by design).
  new.identity_key_strong :=
    public.athlete_identity_key_strong(new.first_name, new.last_name, new.date_of_birth);

  -- Keep confidence in sync (simple rules; app can override to 'claimed')
  if new.date_of_birth is not null and (new.identity_confidence = 'weak') then
    new.identity_confidence := 'strong';
  end if;

  if new.user_id is not null then
    new.identity_confidence := 'claimed';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."athletes_set_identity_keys_trg"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."find_athlete_by_strong_identity"("first_name" "text", "last_name" "text", "date_of_birth" "date", "exclude_athlete_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "sql" STABLE
    AS $$
  select a.id
  from public.athletes a
  where a.identity_key_strong = public.athlete_identity_key_strong(first_name, last_name, date_of_birth)
    and (exclude_athlete_id is null or a.id <> exclude_athlete_id)
  limit 1;
$$;


ALTER FUNCTION "public"."find_athlete_by_strong_identity"("first_name" "text", "last_name" "text", "date_of_birth" "date", "exclude_athlete_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."identity_normalize_name"("input" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select lower(
    regexp_replace(
      coalesce(trim(input), ''),
      '[^a-z0-9]+',  -- remove punctuation/whitespace; keep alphanumerics only
      '',
      'g'
    )
  );
$$;


ALTER FUNCTION "public"."identity_normalize_name"("input" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."identity_sha256_hex"("input" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select encode(digest(coalesce(input, ''), 'sha256'), 'hex');
$$;


ALTER FUNCTION "public"."identity_sha256_hex"("input" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."athlete_identity_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_type" "text" NOT NULL,
    "canonical_athlete_id" "uuid",
    "source_athlete_id" "uuid",
    "program_id" "uuid",
    "actor_user_id" "uuid",
    "details" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "athlete_identity_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['created'::"text", 'updated'::"text", 'duplicate_detected'::"text", 'claimed'::"text", 'merged'::"text"])))
);


ALTER TABLE "public"."athlete_identity_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."athlete_inquiries" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "program_id" "uuid" NOT NULL,
    "athlete_id" "uuid" NOT NULL,
    "source_program_id" "uuid",
    "status" "text" DEFAULT 'new'::"text" NOT NULL,
    "message" "text",
    "contact_email" "text",
    "contact_phone" "text",
    "grad_year" integer,
    "primary_event" "text",
    "pr_blob" "jsonb",
    "coach_notes" "text",
    "requirements" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."athlete_inquiries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."athlete_invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "athlete_id" "uuid" NOT NULL,
    "program_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "invite_token" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."athlete_invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."athlete_media" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "athlete_id" "uuid" NOT NULL,
    "media_type" "text" NOT NULL,
    "role" "text" NOT NULL,
    "url" "text" NOT NULL,
    "storage_bucket" "text",
    "path" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "athlete_media_media_type_check" CHECK (("media_type" = ANY (ARRAY['photo'::"text", 'video'::"text"]))),
    CONSTRAINT "athlete_media_role_check" CHECK (("role" = ANY (ARRAY['highlight_reel'::"text", 'action_shot'::"text", 'gallery'::"text"])))
);


ALTER TABLE "public"."athlete_media" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."athlete_performances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "athlete_id" "uuid" NOT NULL,
    "event_code" "text" NOT NULL,
    "mark_seconds" numeric,
    "mark_value" numeric,
    "is_personal_best" boolean DEFAULT false NOT NULL,
    "performance_date" "date",
    "meet_name" "text",
    "location" "text",
    "performance_type" "text" NOT NULL,
    "timing_method" "text",
    "source_program_id" "uuid",
    "created_by_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "athlete_performances_performance_type_check" CHECK (("performance_type" = ANY (ARRAY['verified_meet'::"text", 'self_reported'::"text", 'training'::"text"]))),
    CONSTRAINT "athlete_performances_timing_method_check" CHECK (("timing_method" = ANY (ARRAY['FAT'::"text", 'manual'::"text"])))
);


ALTER TABLE "public"."athlete_performances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."athlete_scholarship_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_season_id" "uuid" NOT NULL,
    "roster_entry_id" "uuid" NOT NULL,
    "athlete_id" "uuid" NOT NULL,
    "changed_by_user_id" "uuid" NOT NULL,
    "old_amount" numeric,
    "new_amount" numeric,
    "old_unit" "text",
    "new_unit" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."athlete_scholarship_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."athlete_scores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "athlete_id" "uuid" NOT NULL,
    "academic_score" integer DEFAULT 0 NOT NULL,
    "performance_score" integer DEFAULT 0 NOT NULL,
    "availability_score" integer DEFAULT 0 NOT NULL,
    "conduct_score" integer DEFAULT 0 NOT NULL,
    "global_overall" integer DEFAULT 0 NOT NULL,
    "breakdown_json" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "coachable_score" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."athlete_scores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."athlete_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "plan_code" "text" NOT NULL,
    "status" "text" NOT NULL,
    "current_period_end" timestamp with time zone,
    "cancel_at_period_end" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."athlete_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."athlete_training_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "athlete_id" "uuid" NOT NULL,
    "source" "text" NOT NULL,
    "coach_member_id" "uuid",
    "team_season_id" "uuid",
    "scheduled_date" "date",
    "completed_at" timestamp with time zone,
    "workout_category" "text" NOT NULL,
    "title" "text",
    "planned_description" "text",
    "planned_distance_m" integer,
    "planned_duration_sec" integer,
    "planned_rpe" integer,
    "actual_distance_m" integer,
    "actual_duration_sec" integer,
    "actual_rpe" integer,
    "actual_description" "text",
    "metrics_json" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "practice_plan_id" "uuid",
    "practice_group_id" "uuid",
    "workout_id" "uuid",
    "training_event_template_id" "uuid",
    CONSTRAINT "athlete_training_sessions_actual_rpe_check" CHECK ((("actual_rpe" >= 1) AND ("actual_rpe" <= 10))),
    CONSTRAINT "athlete_training_sessions_planned_rpe_check" CHECK ((("planned_rpe" >= 1) AND ("planned_rpe" <= 10))),
    CONSTRAINT "athlete_training_sessions_source_check" CHECK (("source" = ANY (ARRAY['coach_assigned'::"text", 'self_assigned'::"text"]))),
    CONSTRAINT "athlete_training_sessions_workout_category_check" CHECK (("workout_category" = ANY (ARRAY['run'::"text", 'gym'::"text", 'cross_training'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."athlete_training_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."athletes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "organization_id" "uuid",
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "grad_year" integer NOT NULL,
    "event_group" "text" NOT NULL,
    "user_id" "uuid",
    "is_claimed" boolean DEFAULT false NOT NULL,
    "school_id" "uuid",
    "hs_school_name" "text",
    "hs_city" "text",
    "hs_state" "text",
    "hs_country" "text",
    "hs_coach_name" "text",
    "hs_coach_email" "text",
    "hs_coach_phone" "text",
    "avatar_url" "text",
    "gender" "text",
    "bio" "text",
    "gpa" numeric,
    "test_scores" "jsonb",
    "identity_key_weak" "text",
    "identity_key_strong" "text",
    "identity_confidence" "text" DEFAULT 'weak'::"text" NOT NULL,
    "needs_identity_review" boolean DEFAULT false NOT NULL,
    "date_of_birth" "date",
    CONSTRAINT "athletes_gender_check" CHECK (("gender" = ANY (ARRAY['male'::"text", 'female'::"text", 'coed'::"text"]))),
    CONSTRAINT "athletes_identity_confidence_check" CHECK (("identity_confidence" = ANY (ARRAY['weak'::"text", 'strong'::"text", 'claimed'::"text"])))
);


ALTER TABLE "public"."athletes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_definitions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_code" "text" NOT NULL,
    "sport" "text" NOT NULL,
    "category" "text" NOT NULL,
    "gender" "text",
    "display_name" "text" NOT NULL,
    "measurement_unit" "text" NOT NULL,
    "is_relay" boolean DEFAULT false NOT NULL,
    "is_multiround" boolean DEFAULT true NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."event_definitions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."heat_policies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "label" "text" NOT NULL,
    "governing_body" "public"."governing_body_enum" NOT NULL,
    "level" "text",
    "sport" "text",
    "wbgt_unit" "text" DEFAULT 'F'::"text" NOT NULL,
    "low_max" numeric,
    "moderate_min" numeric,
    "moderate_max" numeric,
    "high_min" numeric,
    "high_max" numeric,
    "extreme_min" numeric,
    "guidelines_json" "jsonb" DEFAULT '{}'::"jsonb",
    "is_default" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by_user_id" "uuid",
    "effective_year" integer,
    "source_primary_url" "text",
    "source_version" "text",
    "source_references" "jsonb" DEFAULT '[]'::"jsonb",
    "verified_by_user_id" "uuid",
    "verified_at" timestamp with time zone,
    CONSTRAINT "heat_policies_wbgt_unit_check" CHECK (("wbgt_unit" = ANY (ARRAY['F'::"text", 'C'::"text"])))
);


ALTER TABLE "public"."heat_policies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."memberships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "role" "public"."membership_role" NOT NULL
);


ALTER TABLE "public"."memberships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."practice_group_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "practice_group_id" "uuid" NOT NULL,
    "team_roster_id" "uuid",
    "athlete_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "practice_group_assignments_target_ck" CHECK ((("team_roster_id" IS NOT NULL) OR ("athlete_id" IS NOT NULL)))
);


ALTER TABLE "public"."practice_group_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."practice_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "practice_plan_id" "uuid" NOT NULL,
    "label" "text" NOT NULL,
    "event_group" "text",
    "workout_id" "uuid" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."practice_groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."practice_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "program_id" "uuid" NOT NULL,
    "team_season_id" "uuid",
    "practice_date" "date" NOT NULL,
    "start_time" timestamp with time zone,
    "location" "text",
    "label" "text" NOT NULL,
    "notes" "text",
    "status" "text" DEFAULT 'planned'::"text" NOT NULL,
    "created_by_program_member_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "end_time" timestamp with time zone,
    "weather_snapshot" "jsonb",
    "wbgt_f" numeric,
    "wbgt_c" numeric,
    "heat_risk" "public"."heat_risk_level_enum",
    CONSTRAINT "practice_plans_status_check" CHECK (("status" = ANY (ARRAY['planned'::"text", 'published'::"text", 'completed'::"text", 'canceled'::"text"])))
);


ALTER TABLE "public"."practice_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."practice_weather_snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "practice_plan_id" "uuid" NOT NULL,
    "captured_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "source" "text" NOT NULL,
    "location_text" "text",
    "location_lat" numeric,
    "location_lon" numeric,
    "wbgt_f" numeric,
    "wbgt_c" numeric,
    "temp_f" numeric,
    "temp_c" numeric,
    "humidity_percent" numeric,
    "wind_mph" numeric,
    "wind_kph" numeric,
    "weather_code" integer,
    "weather_summary" "text",
    "heat_risk" "public"."heat_risk_level_enum",
    "governing_body" "public"."governing_body_enum",
    "heat_policy_id" "uuid",
    "conditions_json" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "practice_weather_snapshots_source_check" CHECK (("source" = ANY (ARRAY['tomorrow_io'::"text", 'manual'::"text"])))
);


ALTER TABLE "public"."practice_weather_snapshots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."program_athlete_scores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "program_id" "uuid" NOT NULL,
    "athlete_id" "uuid" NOT NULL,
    "scoring_profile_id" "uuid",
    "overall_for_program" integer DEFAULT 0 NOT NULL,
    "fit_score_for_program" integer,
    "breakdown_json" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."program_athlete_scores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."program_athletes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "program_id" "uuid" NOT NULL,
    "athlete_id" "uuid" NOT NULL,
    "level" "text",
    "relationship_type" "text" DEFAULT 'recruit'::"text" NOT NULL,
    "status" "text",
    "source" "text",
    "created_by_program_member_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "archived_at" timestamp with time zone
);


ALTER TABLE "public"."program_athletes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."program_branding" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "program_id" "uuid" NOT NULL,
    "primary_color" "text",
    "secondary_color" "text",
    "accent_color" "text",
    "background_color" "text",
    "surface_color" "text",
    "foreground_color" "text",
    "muted_foreground_color" "text",
    "success_color" "text",
    "warning_color" "text",
    "danger_color" "text",
    "link_color" "text",
    "logo_url" "text",
    "wordmark_url" "text",
    "mascot_name" "text",
    "theme_mode" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "program_branding_theme_mode_check" CHECK (("theme_mode" = ANY (ARRAY['light'::"text", 'dark'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."program_branding" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."program_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "program_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."program_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."program_recruits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "program_id" "uuid" NOT NULL,
    "recruiting_profile_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'evaluating'::"text" NOT NULL,
    "source" "text" DEFAULT 'coach_manual'::"text" NOT NULL,
    "interest_level" integer,
    "primary_coach_member_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "athlete_id" "uuid"
);


ALTER TABLE "public"."program_recruits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."program_scoring_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "program_id" "uuid" NOT NULL,
    "label" "text" NOT NULL,
    "weights_json" "jsonb" NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."program_scoring_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."program_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "program_id" "uuid" NOT NULL,
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "plan_code" "text" NOT NULL,
    "status" "text" NOT NULL,
    "current_period_end" timestamp with time zone,
    "cancel_at_period_end" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."program_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."programs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "school_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "sport" "text" NOT NULL,
    "gender" "text",
    "level" "text",
    "season" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."programs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recruiting_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "athlete_id" "uuid" NOT NULL,
    "profile_type" "text" DEFAULT 'hs'::"text" NOT NULL,
    "hs_school_id" "uuid",
    "current_program_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."recruiting_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recruits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "grad_year" integer NOT NULL,
    "event_group" "text" NOT NULL,
    "status" "text" NOT NULL,
    "notes" "text",
    "pipeline_stage" "text" DEFAULT ''::"text",
    "interest_level" integer DEFAULT 3,
    "probability" numeric(5,2) DEFAULT 0.25,
    "projected_points" numeric(6,2),
    "last_contact_at" timestamp with time zone,
    "next_action_at" timestamp with time zone,
    "color_tag" "text",
    CONSTRAINT "recruits_interest_level_check" CHECK ((("interest_level" >= 1) AND ("interest_level" <= 5))),
    CONSTRAINT "recruits_pipeline_stage_check" CHECK (("pipeline_stage" = ANY (ARRAY['new'::"text", 'evaluating'::"text", 'priority'::"text", 'offer_out'::"text", 'committed'::"text", 'archived'::"text"]))),
    CONSTRAINT "recruits_probability_check" CHECK ((("probability" >= (0)::numeric) AND ("probability" <= (1)::numeric)))
);


ALTER TABLE "public"."recruits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."roster_athletes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recruit_id" "uuid",
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "sex" "text",
    "grad_year" integer,
    "position_group" "text",
    "primary_event" "text",
    "pr_seconds" numeric(8,2),
    "class_year" "text",
    "scholarship_pct" numeric(5,2),
    "is_active" boolean DEFAULT true NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "roster_athletes_sex_check" CHECK (("sex" = ANY (ARRAY['male'::"text", 'female'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."roster_athletes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."roster_scenario_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "scenario_id" "uuid" NOT NULL,
    "athlete_id" "uuid",
    "program_recruit_id" "uuid",
    "projected_role" "text",
    "projected_status" "text",
    "projected_class_year" integer,
    "event_group" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "scholarship_amount" numeric(8,2),
    "scholarship_unit" "text" DEFAULT 'percent'::"text",
    "scholarship_notes" "text",
    CONSTRAINT "roster_scenario_entries_has_target" CHECK ((("athlete_id" IS NOT NULL) OR ("program_recruit_id" IS NOT NULL))),
    CONSTRAINT "roster_scenario_entries_scholarship_unit_check" CHECK (("scholarship_unit" = ANY (ARRAY['percent'::"text", 'amount'::"text"])))
);


ALTER TABLE "public"."roster_scenario_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."roster_scenarios" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "program_id" "uuid" NOT NULL,
    "team_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "target_season_label" "text",
    "target_season_year" integer,
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."roster_scenarios" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."schools" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "level" "text" NOT NULL,
    "country" "text",
    "state" "text",
    "city" "text",
    "postal_code" "text",
    "short_code" "text",
    "external_ref" "text",
    "is_claimed" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "primary_color" "text",
    "secondary_color" "text",
    "logo_url" "text",
    "domain" "text",
    "identity_json" "jsonb",
    "latitude" numeric,
    "longitude" numeric,
    "timezone" "text"
);


ALTER TABLE "public"."schools" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."season_budget_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_season_id" "uuid" NOT NULL,
    "changed_by_user_id" "uuid" NOT NULL,
    "old_scholarship_budget_equivalents" numeric,
    "new_scholarship_budget_equivalents" numeric,
    "old_scholarship_budget_amount" numeric,
    "new_scholarship_budget_amount" numeric,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."season_budget_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_roster" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "program_id" "uuid" NOT NULL,
    "team_id" "uuid" NOT NULL,
    "team_season_id" "uuid" NOT NULL,
    "athlete_id" "uuid" NOT NULL,
    "jersey_number" "text",
    "role" "text",
    "status" "text",
    "depth_order" integer,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "program_recruit_id" "uuid",
    "scholarship_amount" numeric(8,2),
    "scholarship_unit" "text" DEFAULT 'percent'::"text",
    "scholarship_notes" "text",
    "event_group" "text",
    CONSTRAINT "team_roster_scholarship_unit_check" CHECK (("scholarship_unit" = ANY (ARRAY['percent'::"text", 'equivalency'::"text", 'amount'::"text"])))
);


ALTER TABLE "public"."team_roster" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_roster_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_roster_id" "uuid" NOT NULL,
    "event_code" "text" NOT NULL,
    "is_primary" boolean DEFAULT false NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."team_roster_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_seasons" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "program_id" "uuid" NOT NULL,
    "academic_year" "text" NOT NULL,
    "year_start" integer NOT NULL,
    "year_end" integer,
    "season_label" "text" NOT NULL,
    "is_current" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "season_year" integer,
    "start_date" "date",
    "end_date" "date",
    "is_active" boolean DEFAULT true NOT NULL,
    "roster_lock_date" timestamp with time zone,
    "scholarship_budget_equivalents" numeric(6,2),
    "scholarship_budget_amount" numeric(10,2),
    "scholarship_currency" "text" DEFAULT 'USD'::"text",
    "is_locked" boolean DEFAULT false,
    "event_group_quotas" "jsonb" DEFAULT '{}'::"jsonb",
    "governing_body" "public"."governing_body_enum",
    "heat_policy_id" "uuid"
);


ALTER TABLE "public"."team_seasons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "program_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "code" "text",
    "sport" "text",
    "gender" "text",
    "level" "text",
    "season" "text",
    "is_primary" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "scholarship_budget" numeric,
    "scholarship_unit" "text"
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."training_event_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "program_id" "uuid",
    "event_code" "text",
    "label" "text" NOT NULL,
    "description" "text",
    "default_parameters" "jsonb" DEFAULT '{}'::"jsonb",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "is_active" boolean DEFAULT true NOT NULL,
    "created_by_program_member_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."training_event_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transfer_portal_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "athlete_id" "uuid" NOT NULL,
    "current_program_id" "uuid" NOT NULL,
    "recruiting_profile_id" "uuid",
    "active" boolean DEFAULT true NOT NULL,
    "entered_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "withdrawn_at" timestamp with time zone,
    "notes" "text"
);


ALTER TABLE "public"."transfer_portal_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "name" "text",
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "user_subscription_tier" "public"."subscription_tier",
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "user_billing_status" "public"."billing_status",
    "subscription_tier" "text",
    "billing_status" "public"."billing_status_enum" DEFAULT 'none'::"public"."billing_status_enum",
    "ai_assistant_enabled" boolean DEFAULT false,
    "avatar_url" "text"
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workout_steps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workout_id" "uuid" NOT NULL,
    "step_index" integer NOT NULL,
    "training_event_template_id" "uuid",
    "label" "text",
    "parameters_override" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."workout_steps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workouts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "program_id" "uuid" NOT NULL,
    "label" "text" NOT NULL,
    "description" "text",
    "is_system_template" boolean DEFAULT false NOT NULL,
    "created_by_program_member_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."workouts" OWNER TO "postgres";


ALTER TABLE ONLY "public"."athlete_identity_events"
    ADD CONSTRAINT "athlete_identity_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."athlete_inquiries"
    ADD CONSTRAINT "athlete_inquiries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."athlete_invites"
    ADD CONSTRAINT "athlete_invites_invite_token_key" UNIQUE ("invite_token");



ALTER TABLE ONLY "public"."athlete_invites"
    ADD CONSTRAINT "athlete_invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."athlete_media"
    ADD CONSTRAINT "athlete_media_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."athlete_performances"
    ADD CONSTRAINT "athlete_performances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."athlete_scholarship_history"
    ADD CONSTRAINT "athlete_scholarship_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."athlete_scores"
    ADD CONSTRAINT "athlete_scores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."athlete_subscriptions"
    ADD CONSTRAINT "athlete_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."athlete_subscriptions"
    ADD CONSTRAINT "athlete_subscriptions_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."athlete_training_sessions"
    ADD CONSTRAINT "athlete_training_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."athletes"
    ADD CONSTRAINT "athletes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."athletes"
    ADD CONSTRAINT "athletes_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."event_definitions"
    ADD CONSTRAINT "event_definitions_event_code_key" UNIQUE ("event_code");



ALTER TABLE ONLY "public"."event_definitions"
    ADD CONSTRAINT "event_definitions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."heat_policies"
    ADD CONSTRAINT "heat_policies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."practice_group_assignments"
    ADD CONSTRAINT "practice_group_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."practice_groups"
    ADD CONSTRAINT "practice_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."practice_plans"
    ADD CONSTRAINT "practice_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."practice_weather_snapshots"
    ADD CONSTRAINT "practice_weather_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."program_athlete_scores"
    ADD CONSTRAINT "program_athlete_scores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."program_athletes"
    ADD CONSTRAINT "program_athletes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."program_branding"
    ADD CONSTRAINT "program_branding_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."program_branding"
    ADD CONSTRAINT "program_branding_program_id_key" UNIQUE ("program_id");



ALTER TABLE ONLY "public"."program_members"
    ADD CONSTRAINT "program_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."program_members"
    ADD CONSTRAINT "program_members_unique" UNIQUE ("program_id", "user_id");



ALTER TABLE ONLY "public"."program_recruits"
    ADD CONSTRAINT "program_recruits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."program_scoring_profiles"
    ADD CONSTRAINT "program_scoring_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."program_subscriptions"
    ADD CONSTRAINT "program_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."program_subscriptions"
    ADD CONSTRAINT "program_subscriptions_program_id_key" UNIQUE ("program_id");



ALTER TABLE ONLY "public"."program_subscriptions"
    ADD CONSTRAINT "program_subscriptions_stripe_subscription_id_key" UNIQUE ("stripe_subscription_id");



ALTER TABLE ONLY "public"."programs"
    ADD CONSTRAINT "programs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recruiting_profiles"
    ADD CONSTRAINT "recruiting_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recruits"
    ADD CONSTRAINT "recruits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."roster_athletes"
    ADD CONSTRAINT "roster_athletes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."roster_scenario_entries"
    ADD CONSTRAINT "roster_scenario_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."roster_scenarios"
    ADD CONSTRAINT "roster_scenarios_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."season_budget_history"
    ADD CONSTRAINT "season_budget_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_roster_events"
    ADD CONSTRAINT "team_roster_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_roster"
    ADD CONSTRAINT "team_roster_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_seasons"
    ADD CONSTRAINT "team_seasons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_seasons"
    ADD CONSTRAINT "team_seasons_unique_team_year_season" UNIQUE ("team_id", "academic_year", "season_label");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."training_event_templates"
    ADD CONSTRAINT "training_event_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transfer_portal_entries"
    ADD CONSTRAINT "transfer_portal_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workout_steps"
    ADD CONSTRAINT "workout_steps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workouts"
    ADD CONSTRAINT "workouts_pkey" PRIMARY KEY ("id");



CREATE INDEX "athlete_identity_events_canonical_idx" ON "public"."athlete_identity_events" USING "btree" ("canonical_athlete_id");



CREATE INDEX "athlete_identity_events_source_idx" ON "public"."athlete_identity_events" USING "btree" ("source_athlete_id");



CREATE INDEX "athlete_inquiries_athlete_id_idx" ON "public"."athlete_inquiries" USING "btree" ("athlete_id");



CREATE INDEX "athlete_inquiries_program_id_idx" ON "public"."athlete_inquiries" USING "btree" ("program_id");



CREATE INDEX "athlete_inquiries_status_idx" ON "public"."athlete_inquiries" USING "btree" ("status");



CREATE INDEX "athlete_media_athlete_id_idx" ON "public"."athlete_media" USING "btree" ("athlete_id");



CREATE INDEX "athlete_media_athlete_role_type_idx" ON "public"."athlete_media" USING "btree" ("athlete_id", "role", "media_type");



CREATE UNIQUE INDEX "athlete_media_unique_highlight_reel_idx" ON "public"."athlete_media" USING "btree" ("athlete_id") WHERE ("role" = 'highlight_reel'::"text");



CREATE INDEX "athlete_performances_athlete_id_idx" ON "public"."athlete_performances" USING "btree" ("athlete_id");



CREATE INDEX "athlete_performances_event_type_idx" ON "public"."athlete_performances" USING "btree" ("athlete_id", "event_code", "performance_type");



CREATE INDEX "athlete_performances_pb_idx" ON "public"."athlete_performances" USING "btree" ("athlete_id", "event_code") WHERE ("is_personal_best" = true);



CREATE INDEX "athlete_performances_type_idx" ON "public"."athlete_performances" USING "btree" ("performance_type");



CREATE UNIQUE INDEX "athlete_scores_athlete_id_key" ON "public"."athlete_scores" USING "btree" ("athlete_id");



CREATE INDEX "athlete_training_sessions_athlete_id_idx" ON "public"."athlete_training_sessions" USING "btree" ("athlete_id");



CREATE INDEX "athlete_training_sessions_practice_group_idx" ON "public"."athlete_training_sessions" USING "btree" ("practice_group_id");



CREATE INDEX "athlete_training_sessions_practice_plan_idx" ON "public"."athlete_training_sessions" USING "btree" ("practice_plan_id");



CREATE INDEX "athlete_training_sessions_scheduled_date_idx" ON "public"."athlete_training_sessions" USING "btree" ("scheduled_date");



CREATE INDEX "athlete_training_sessions_source_idx" ON "public"."athlete_training_sessions" USING "btree" ("source");



CREATE INDEX "athlete_training_sessions_team_season_id_idx" ON "public"."athlete_training_sessions" USING "btree" ("team_season_id");



CREATE INDEX "athlete_training_sessions_training_event_template_idx" ON "public"."athlete_training_sessions" USING "btree" ("training_event_template_id");



CREATE INDEX "athlete_training_sessions_workout_idx" ON "public"."athlete_training_sessions" USING "btree" ("workout_id");



CREATE INDEX "athletes_gender_idx" ON "public"."athletes" USING "btree" ("gender");



CREATE UNIQUE INDEX "athletes_identity_key_strong_unique" ON "public"."athletes" USING "btree" ("identity_key_strong") WHERE ("identity_key_strong" IS NOT NULL);



CREATE INDEX "athletes_identity_key_weak_idx" ON "public"."athletes" USING "btree" ("identity_key_weak");



CREATE INDEX "idx_athlete_invites_athlete_id" ON "public"."athlete_invites" USING "btree" ("athlete_id");



CREATE INDEX "idx_athlete_scholarship_history_team_season" ON "public"."athlete_scholarship_history" USING "btree" ("team_season_id", "created_at" DESC);



CREATE INDEX "idx_athlete_subscriptions_user_id" ON "public"."athlete_subscriptions" USING "btree" ("user_id");



CREATE UNIQUE INDEX "idx_athlete_subscriptions_user_sub" ON "public"."athlete_subscriptions" USING "btree" ("user_id", "stripe_subscription_id");



CREATE INDEX "idx_program_subscriptions_program_id" ON "public"."program_subscriptions" USING "btree" ("program_id");



CREATE UNIQUE INDEX "idx_program_subscriptions_program_sub" ON "public"."program_subscriptions" USING "btree" ("program_id", "stripe_subscription_id");



CREATE INDEX "idx_programs_school_id" ON "public"."programs" USING "btree" ("school_id");



CREATE INDEX "idx_roster_athletes_recruit" ON "public"."roster_athletes" USING "btree" ("recruit_id");



CREATE INDEX "idx_roster_scenario_entries_scenario" ON "public"."roster_scenario_entries" USING "btree" ("scenario_id", "created_at" DESC);



CREATE INDEX "idx_season_budget_history_team_season" ON "public"."season_budget_history" USING "btree" ("team_season_id", "created_at" DESC);



CREATE INDEX "practice_group_assignments_group_idx" ON "public"."practice_group_assignments" USING "btree" ("practice_group_id");



CREATE INDEX "practice_groups_plan_idx" ON "public"."practice_groups" USING "btree" ("practice_plan_id");



CREATE INDEX "practice_plans_heat_risk_idx" ON "public"."practice_plans" USING "btree" ("heat_risk");



CREATE INDEX "practice_weather_snapshots_heat_risk_idx" ON "public"."practice_weather_snapshots" USING "btree" ("heat_risk");



CREATE INDEX "practice_weather_snapshots_practice_plan_id_idx" ON "public"."practice_weather_snapshots" USING "btree" ("practice_plan_id");



CREATE INDEX "program_athlete_scores_athlete_id_idx" ON "public"."program_athlete_scores" USING "btree" ("athlete_id");



CREATE UNIQUE INDEX "program_athlete_scores_program_athlete_key" ON "public"."program_athlete_scores" USING "btree" ("program_id", "athlete_id");



CREATE INDEX "program_athlete_scores_program_id_idx" ON "public"."program_athlete_scores" USING "btree" ("program_id");



CREATE INDEX "program_athletes_athlete_id_idx" ON "public"."program_athletes" USING "btree" ("athlete_id");



CREATE UNIQUE INDEX "program_athletes_program_athlete_unique" ON "public"."program_athletes" USING "btree" ("program_id", "athlete_id") WHERE ("athlete_id" IS NOT NULL);



CREATE UNIQUE INDEX "program_athletes_program_id_athlete_id_uniq" ON "public"."program_athletes" USING "btree" ("program_id", "athlete_id");



CREATE INDEX "program_athletes_program_id_idx" ON "public"."program_athletes" USING "btree" ("program_id");



CREATE INDEX "program_athletes_relationship_type_idx" ON "public"."program_athletes" USING "btree" ("relationship_type");



CREATE INDEX "program_members_program_id_idx" ON "public"."program_members" USING "btree" ("program_id");



CREATE INDEX "program_members_user_id_idx" ON "public"."program_members" USING "btree" ("user_id");



CREATE INDEX "program_recruits_profile_idx" ON "public"."program_recruits" USING "btree" ("recruiting_profile_id");



CREATE INDEX "program_recruits_program_id_idx" ON "public"."program_recruits" USING "btree" ("program_id");



CREATE UNIQUE INDEX "program_recruits_program_profile_unique" ON "public"."program_recruits" USING "btree" ("program_id", "recruiting_profile_id");



CREATE INDEX "program_scoring_profiles_program_id_idx" ON "public"."program_scoring_profiles" USING "btree" ("program_id");



CREATE INDEX "recruiting_profiles_athlete_id_idx" ON "public"."recruiting_profiles" USING "btree" ("athlete_id");



CREATE INDEX "recruiting_profiles_type_idx" ON "public"."recruiting_profiles" USING "btree" ("profile_type");



CREATE INDEX "roster_scenario_entries_scenario_idx" ON "public"."roster_scenario_entries" USING "btree" ("scenario_id");



CREATE INDEX "roster_scenarios_program_team_idx" ON "public"."roster_scenarios" USING "btree" ("program_id", "team_id");



CREATE INDEX "team_roster_events_team_roster_id_idx" ON "public"."team_roster_events" USING "btree" ("team_roster_id");



CREATE INDEX "team_roster_program_id_idx" ON "public"."team_roster" USING "btree" ("program_id");



CREATE INDEX "team_roster_program_recruit_id_idx" ON "public"."team_roster" USING "btree" ("program_recruit_id");



CREATE UNIQUE INDEX "team_roster_team_season_athlete_unique" ON "public"."team_roster" USING "btree" ("team_season_id", "athlete_id") WHERE ("athlete_id" IS NOT NULL);



CREATE INDEX "team_roster_team_season_id_idx" ON "public"."team_roster" USING "btree" ("team_season_id");



CREATE INDEX "team_roster_team_season_idx" ON "public"."team_roster" USING "btree" ("team_season_id");



CREATE UNIQUE INDEX "team_roster_team_season_recruit_unique" ON "public"."team_roster" USING "btree" ("team_season_id", "program_recruit_id") WHERE ("program_recruit_id" IS NOT NULL);



CREATE UNIQUE INDEX "team_roster_unique_entry" ON "public"."team_roster" USING "btree" ("team_season_id", "athlete_id");



CREATE UNIQUE INDEX "team_roster_unique_team_season_athlete" ON "public"."team_roster" USING "btree" ("team_season_id", "athlete_id");



CREATE INDEX "team_seasons_heat_policy_id_idx" ON "public"."team_seasons" USING "btree" ("heat_policy_id");



CREATE INDEX "team_seasons_program_id_idx" ON "public"."team_seasons" USING "btree" ("program_id");



CREATE INDEX "team_seasons_team_id_idx" ON "public"."team_seasons" USING "btree" ("team_id");



CREATE INDEX "teams_program_id_idx" ON "public"."teams" USING "btree" ("program_id");



CREATE UNIQUE INDEX "transfer_portal_entries_active_unique" ON "public"."transfer_portal_entries" USING "btree" ("athlete_id") WHERE ("active" = true);



CREATE UNIQUE INDEX "workout_steps_workout_step_index_idx" ON "public"."workout_steps" USING "btree" ("workout_id", "step_index");



CREATE OR REPLACE TRIGGER "athletes_set_identity_keys" BEFORE INSERT OR UPDATE OF "first_name", "last_name", "grad_year", "date_of_birth", "user_id" ON "public"."athletes" FOR EACH ROW EXECUTE FUNCTION "public"."athletes_set_identity_keys_trg"();



ALTER TABLE ONLY "public"."athlete_identity_events"
    ADD CONSTRAINT "athlete_identity_events_actor_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."athlete_identity_events"
    ADD CONSTRAINT "athlete_identity_events_canonical_fkey" FOREIGN KEY ("canonical_athlete_id") REFERENCES "public"."athletes"("id");



ALTER TABLE ONLY "public"."athlete_identity_events"
    ADD CONSTRAINT "athlete_identity_events_program_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id");



ALTER TABLE ONLY "public"."athlete_identity_events"
    ADD CONSTRAINT "athlete_identity_events_source_fkey" FOREIGN KEY ("source_athlete_id") REFERENCES "public"."athletes"("id");



ALTER TABLE ONLY "public"."athlete_inquiries"
    ADD CONSTRAINT "athlete_inquiries_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."athlete_inquiries"
    ADD CONSTRAINT "athlete_inquiries_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."athlete_inquiries"
    ADD CONSTRAINT "athlete_inquiries_source_program_id_fkey" FOREIGN KEY ("source_program_id") REFERENCES "public"."programs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."athlete_invites"
    ADD CONSTRAINT "athlete_invites_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."athlete_invites"
    ADD CONSTRAINT "athlete_invites_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."athlete_media"
    ADD CONSTRAINT "athlete_media_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."athlete_performances"
    ADD CONSTRAINT "athlete_performances_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."athlete_performances"
    ADD CONSTRAINT "athlete_performances_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."athlete_performances"
    ADD CONSTRAINT "athlete_performances_source_program_id_fkey" FOREIGN KEY ("source_program_id") REFERENCES "public"."programs"("id");



ALTER TABLE ONLY "public"."athlete_scholarship_history"
    ADD CONSTRAINT "athlete_scholarship_history_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."athlete_scholarship_history"
    ADD CONSTRAINT "athlete_scholarship_history_changed_by_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."athlete_scholarship_history"
    ADD CONSTRAINT "athlete_scholarship_history_roster_entry_id_fkey" FOREIGN KEY ("roster_entry_id") REFERENCES "public"."team_roster"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."athlete_scholarship_history"
    ADD CONSTRAINT "athlete_scholarship_history_team_season_id_fkey" FOREIGN KEY ("team_season_id") REFERENCES "public"."team_seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."athlete_scores"
    ADD CONSTRAINT "athlete_scores_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."athlete_subscriptions"
    ADD CONSTRAINT "athlete_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."athlete_training_sessions"
    ADD CONSTRAINT "athlete_training_sessions_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."athlete_training_sessions"
    ADD CONSTRAINT "athlete_training_sessions_coach_member_id_fkey" FOREIGN KEY ("coach_member_id") REFERENCES "public"."program_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."athlete_training_sessions"
    ADD CONSTRAINT "athlete_training_sessions_practice_group_id_fkey" FOREIGN KEY ("practice_group_id") REFERENCES "public"."practice_groups"("id");



ALTER TABLE ONLY "public"."athlete_training_sessions"
    ADD CONSTRAINT "athlete_training_sessions_practice_plan_id_fkey" FOREIGN KEY ("practice_plan_id") REFERENCES "public"."practice_plans"("id");



ALTER TABLE ONLY "public"."athlete_training_sessions"
    ADD CONSTRAINT "athlete_training_sessions_team_season_id_fkey" FOREIGN KEY ("team_season_id") REFERENCES "public"."team_seasons"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."athlete_training_sessions"
    ADD CONSTRAINT "athlete_training_sessions_training_event_template_id_fkey" FOREIGN KEY ("training_event_template_id") REFERENCES "public"."training_event_templates"("id");



ALTER TABLE ONLY "public"."athlete_training_sessions"
    ADD CONSTRAINT "athlete_training_sessions_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id");



ALTER TABLE ONLY "public"."athletes"
    ADD CONSTRAINT "athletes_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id");



ALTER TABLE ONLY "public"."athletes"
    ADD CONSTRAINT "athletes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."heat_policies"
    ADD CONSTRAINT "heat_policies_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."heat_policies"
    ADD CONSTRAINT "heat_policies_verified_by_user_id_fkey" FOREIGN KEY ("verified_by_user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."practice_group_assignments"
    ADD CONSTRAINT "practice_group_assignments_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id");



ALTER TABLE ONLY "public"."practice_group_assignments"
    ADD CONSTRAINT "practice_group_assignments_practice_group_id_fkey" FOREIGN KEY ("practice_group_id") REFERENCES "public"."practice_groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."practice_group_assignments"
    ADD CONSTRAINT "practice_group_assignments_team_roster_id_fkey" FOREIGN KEY ("team_roster_id") REFERENCES "public"."team_roster"("id");



ALTER TABLE ONLY "public"."practice_groups"
    ADD CONSTRAINT "practice_groups_practice_plan_id_fkey" FOREIGN KEY ("practice_plan_id") REFERENCES "public"."practice_plans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."practice_groups"
    ADD CONSTRAINT "practice_groups_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id");



ALTER TABLE ONLY "public"."practice_plans"
    ADD CONSTRAINT "practice_plans_created_by_program_member_id_fkey" FOREIGN KEY ("created_by_program_member_id") REFERENCES "public"."program_members"("id");



ALTER TABLE ONLY "public"."practice_plans"
    ADD CONSTRAINT "practice_plans_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id");



ALTER TABLE ONLY "public"."practice_plans"
    ADD CONSTRAINT "practice_plans_team_season_id_fkey" FOREIGN KEY ("team_season_id") REFERENCES "public"."team_seasons"("id");



ALTER TABLE ONLY "public"."practice_weather_snapshots"
    ADD CONSTRAINT "practice_weather_snapshots_heat_policy_id_fkey" FOREIGN KEY ("heat_policy_id") REFERENCES "public"."heat_policies"("id");



ALTER TABLE ONLY "public"."practice_weather_snapshots"
    ADD CONSTRAINT "practice_weather_snapshots_practice_plan_id_fkey" FOREIGN KEY ("practice_plan_id") REFERENCES "public"."practice_plans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."program_athlete_scores"
    ADD CONSTRAINT "program_athlete_scores_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."program_athlete_scores"
    ADD CONSTRAINT "program_athlete_scores_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."program_athlete_scores"
    ADD CONSTRAINT "program_athlete_scores_scoring_profile_id_fkey" FOREIGN KEY ("scoring_profile_id") REFERENCES "public"."program_scoring_profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."program_athletes"
    ADD CONSTRAINT "program_athletes_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."program_athletes"
    ADD CONSTRAINT "program_athletes_created_by_program_member_id_fkey" FOREIGN KEY ("created_by_program_member_id") REFERENCES "public"."program_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."program_athletes"
    ADD CONSTRAINT "program_athletes_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."program_branding"
    ADD CONSTRAINT "program_branding_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."program_members"
    ADD CONSTRAINT "program_members_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."program_members"
    ADD CONSTRAINT "program_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."program_recruits"
    ADD CONSTRAINT "program_recruits_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."program_recruits"
    ADD CONSTRAINT "program_recruits_primary_coach_member_id_fkey" FOREIGN KEY ("primary_coach_member_id") REFERENCES "public"."program_members"("id");



ALTER TABLE ONLY "public"."program_recruits"
    ADD CONSTRAINT "program_recruits_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."program_recruits"
    ADD CONSTRAINT "program_recruits_recruiting_profile_id_fkey" FOREIGN KEY ("recruiting_profile_id") REFERENCES "public"."recruiting_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."program_scoring_profiles"
    ADD CONSTRAINT "program_scoring_profiles_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."program_subscriptions"
    ADD CONSTRAINT "program_subscriptions_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."programs"
    ADD CONSTRAINT "programs_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recruiting_profiles"
    ADD CONSTRAINT "recruiting_profiles_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recruiting_profiles"
    ADD CONSTRAINT "recruiting_profiles_current_program_id_fkey" FOREIGN KEY ("current_program_id") REFERENCES "public"."programs"("id");



ALTER TABLE ONLY "public"."recruiting_profiles"
    ADD CONSTRAINT "recruiting_profiles_hs_school_id_fkey" FOREIGN KEY ("hs_school_id") REFERENCES "public"."schools"("id");



ALTER TABLE ONLY "public"."roster_athletes"
    ADD CONSTRAINT "roster_athletes_recruit_id_fkey" FOREIGN KEY ("recruit_id") REFERENCES "public"."recruits"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."roster_scenario_entries"
    ADD CONSTRAINT "roster_scenario_entries_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."roster_scenario_entries"
    ADD CONSTRAINT "roster_scenario_entries_program_recruit_id_fkey" FOREIGN KEY ("program_recruit_id") REFERENCES "public"."program_recruits"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."roster_scenario_entries"
    ADD CONSTRAINT "roster_scenario_entries_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "public"."roster_scenarios"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."roster_scenarios"
    ADD CONSTRAINT "roster_scenarios_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."roster_scenarios"
    ADD CONSTRAINT "roster_scenarios_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."roster_scenarios"
    ADD CONSTRAINT "roster_scenarios_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."season_budget_history"
    ADD CONSTRAINT "season_budget_history_changed_by_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."season_budget_history"
    ADD CONSTRAINT "season_budget_history_team_season_id_fkey" FOREIGN KEY ("team_season_id") REFERENCES "public"."team_seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_roster"
    ADD CONSTRAINT "team_roster_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_roster_events"
    ADD CONSTRAINT "team_roster_events_team_roster_id_fkey" FOREIGN KEY ("team_roster_id") REFERENCES "public"."team_roster"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_roster"
    ADD CONSTRAINT "team_roster_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_roster"
    ADD CONSTRAINT "team_roster_program_recruit_id_fkey" FOREIGN KEY ("program_recruit_id") REFERENCES "public"."program_recruits"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."team_roster"
    ADD CONSTRAINT "team_roster_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_roster"
    ADD CONSTRAINT "team_roster_team_season_id_fkey" FOREIGN KEY ("team_season_id") REFERENCES "public"."team_seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_seasons"
    ADD CONSTRAINT "team_seasons_heat_policy_id_fkey" FOREIGN KEY ("heat_policy_id") REFERENCES "public"."heat_policies"("id");



ALTER TABLE ONLY "public"."team_seasons"
    ADD CONSTRAINT "team_seasons_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_seasons"
    ADD CONSTRAINT "team_seasons_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."training_event_templates"
    ADD CONSTRAINT "training_event_templates_created_by_program_member_id_fkey" FOREIGN KEY ("created_by_program_member_id") REFERENCES "public"."program_members"("id");



ALTER TABLE ONLY "public"."training_event_templates"
    ADD CONSTRAINT "training_event_templates_event_code_fkey" FOREIGN KEY ("event_code") REFERENCES "public"."event_definitions"("event_code");



ALTER TABLE ONLY "public"."training_event_templates"
    ADD CONSTRAINT "training_event_templates_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id");



ALTER TABLE ONLY "public"."transfer_portal_entries"
    ADD CONSTRAINT "transfer_portal_entries_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transfer_portal_entries"
    ADD CONSTRAINT "transfer_portal_entries_current_program_id_fkey" FOREIGN KEY ("current_program_id") REFERENCES "public"."programs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transfer_portal_entries"
    ADD CONSTRAINT "transfer_portal_entries_recruiting_profile_id_fkey" FOREIGN KEY ("recruiting_profile_id") REFERENCES "public"."recruiting_profiles"("id");



ALTER TABLE ONLY "public"."workout_steps"
    ADD CONSTRAINT "workout_steps_training_event_template_id_fkey" FOREIGN KEY ("training_event_template_id") REFERENCES "public"."training_event_templates"("id");



ALTER TABLE ONLY "public"."workout_steps"
    ADD CONSTRAINT "workout_steps_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workouts"
    ADD CONSTRAINT "workouts_created_by_program_member_id_fkey" FOREIGN KEY ("created_by_program_member_id") REFERENCES "public"."program_members"("id");



ALTER TABLE ONLY "public"."workouts"
    ADD CONSTRAINT "workouts_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id");



CREATE POLICY "Allow select for dev" ON "public"."athletes" FOR SELECT USING (true);



CREATE POLICY "Athlete crud own media" ON "public"."athlete_media" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."athletes" "a"
  WHERE (("a"."id" = "athlete_media"."athlete_id") AND ("a"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."athletes" "a"
  WHERE (("a"."id" = "athlete_media"."athlete_id") AND ("a"."user_id" = "auth"."uid"())))));



CREATE POLICY "Athlete crud self performances" ON "public"."athlete_performances" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."athletes" "a"
  WHERE (("a"."id" = "athlete_performances"."athlete_id") AND ("a"."user_id" = "auth"."uid"()))))) WITH CHECK ((("performance_type" = ANY (ARRAY['self_reported'::"text", 'training'::"text"])) AND (EXISTS ( SELECT 1
   FROM "public"."athletes" "a"
  WHERE (("a"."id" = "athlete_performances"."athlete_id") AND ("a"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Coach crud verified performances" ON "public"."athlete_performances" TO "authenticated" USING ((("performance_type" = 'verified_meet'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."program_members" "pm"
  WHERE (("pm"."user_id" = "auth"."uid"()) AND ("pm"."program_id" = "athlete_performances"."source_program_id")))))) WITH CHECK ((("performance_type" = 'verified_meet'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."program_members" "pm"
  WHERE (("pm"."user_id" = "auth"."uid"()) AND ("pm"."program_id" = "athlete_performances"."source_program_id"))))));



CREATE POLICY "Insert own membership" ON "public"."program_members" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "program_members"."user_id") AND ("u"."auth_id" = "auth"."uid"())))));



CREATE POLICY "Public select athlete_media_active" ON "public"."athlete_media" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Public select verified performances" ON "public"."athlete_performances" FOR SELECT USING (("performance_type" = 'verified_meet'::"text"));



CREATE POLICY "Select own memberships" ON "public"."program_members" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "program_members"."user_id") AND ("u"."auth_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert recruits for their org" ON "public"."recruits" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "memberships"."organization_id"
   FROM "public"."memberships"
  WHERE ("memberships"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update recruits for their org" ON "public"."recruits" FOR UPDATE USING (("organization_id" IN ( SELECT "memberships"."organization_id"
   FROM "public"."memberships"
  WHERE ("memberships"."user_id" = "auth"."uid"())))) WITH CHECK (("organization_id" IN ( SELECT "memberships"."organization_id"
   FROM "public"."memberships"
  WHERE ("memberships"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."athlete_media" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."athlete_performances" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."athlete_training_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."athletes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ats_delete_staff" ON "public"."athlete_training_sessions" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ("public"."program_members" "pm"
     JOIN "public"."users" "u" ON (("u"."id" = "pm"."user_id")))
  WHERE (("u"."auth_id" = "auth"."uid"()) AND (("athlete_training_sessions"."coach_member_id" = "pm"."id") OR (EXISTS ( SELECT 1
           FROM ("public"."team_roster" "tr"
             JOIN "public"."team_seasons" "ts" ON (("ts"."id" = "tr"."team_season_id")))
          WHERE (("tr"."athlete_id" = "athlete_training_sessions"."athlete_id") AND ("ts"."program_id" = "pm"."program_id")))) OR (("athlete_training_sessions"."practice_plan_id" IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM "public"."practice_plans" "pp"
          WHERE (("pp"."id" = "athlete_training_sessions"."practice_plan_id") AND ("pp"."program_id" = "pm"."program_id"))))))))));



CREATE POLICY "ats_insert_staff" ON "public"."athlete_training_sessions" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."program_members" "pm"
     JOIN "public"."users" "u" ON (("u"."id" = "pm"."user_id")))
  WHERE (("u"."auth_id" = "auth"."uid"()) AND (("athlete_training_sessions"."coach_member_id" = "pm"."id") OR (EXISTS ( SELECT 1
           FROM ("public"."team_roster" "tr"
             JOIN "public"."team_seasons" "ts" ON (("ts"."id" = "tr"."team_season_id")))
          WHERE (("tr"."athlete_id" = "athlete_training_sessions"."athlete_id") AND ("ts"."program_id" = "pm"."program_id")))) OR (("athlete_training_sessions"."practice_plan_id" IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM "public"."practice_plans" "pp"
          WHERE (("pp"."id" = "athlete_training_sessions"."practice_plan_id") AND ("pp"."program_id" = "pm"."program_id"))))))))));



CREATE POLICY "ats_select_athlete" ON "public"."athlete_training_sessions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."athletes" "a"
     JOIN "public"."users" "u" ON (("a"."user_id" = "u"."id")))
  WHERE (("a"."id" = "athlete_training_sessions"."athlete_id") AND ("u"."auth_id" = "auth"."uid"())))));



CREATE POLICY "ats_select_dev" ON "public"."athlete_training_sessions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "ats_select_staff" ON "public"."athlete_training_sessions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."program_members" "pm"
     JOIN "public"."users" "u" ON (("u"."id" = "pm"."user_id")))
  WHERE (("u"."auth_id" = "auth"."uid"()) AND ((EXISTS ( SELECT 1
           FROM ("public"."team_roster" "tr"
             JOIN "public"."team_seasons" "ts" ON (("ts"."id" = "tr"."team_season_id")))
          WHERE (("tr"."athlete_id" = "athlete_training_sessions"."athlete_id") AND ("ts"."program_id" = "pm"."program_id")))) OR ("athlete_training_sessions"."coach_member_id" = "pm"."id") OR (("athlete_training_sessions"."practice_plan_id" IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM "public"."practice_plans" "pp"
          WHERE (("pp"."id" = "athlete_training_sessions"."practice_plan_id") AND ("pp"."program_id" = "pm"."program_id"))))))))));



CREATE POLICY "ats_update_athlete_self" ON "public"."athlete_training_sessions" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ("public"."athletes" "a"
     JOIN "public"."users" "u" ON (("a"."user_id" = "u"."id")))
  WHERE (("a"."id" = "athlete_training_sessions"."athlete_id") AND ("u"."auth_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."athletes" "a"
     JOIN "public"."users" "u" ON (("a"."user_id" = "u"."id")))
  WHERE (("a"."id" = "athlete_training_sessions"."athlete_id") AND ("u"."auth_id" = "auth"."uid"())))));



CREATE POLICY "ats_update_staff" ON "public"."athlete_training_sessions" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ("public"."program_members" "pm"
     JOIN "public"."users" "u" ON (("u"."id" = "pm"."user_id")))
  WHERE (("u"."auth_id" = "auth"."uid"()) AND (("athlete_training_sessions"."coach_member_id" = "pm"."id") OR (EXISTS ( SELECT 1
           FROM ("public"."team_roster" "tr"
             JOIN "public"."team_seasons" "ts" ON (("ts"."id" = "tr"."team_season_id")))
          WHERE (("tr"."athlete_id" = "athlete_training_sessions"."athlete_id") AND ("ts"."program_id" = "pm"."program_id")))) OR (("athlete_training_sessions"."practice_plan_id" IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM "public"."practice_plans" "pp"
          WHERE (("pp"."id" = "athlete_training_sessions"."practice_plan_id") AND ("pp"."program_id" = "pm"."program_id")))))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."program_members" "pm"
     JOIN "public"."users" "u" ON (("u"."id" = "pm"."user_id")))
  WHERE (("u"."auth_id" = "auth"."uid"()) AND (("athlete_training_sessions"."coach_member_id" = "pm"."id") OR (EXISTS ( SELECT 1
           FROM ("public"."team_roster" "tr"
             JOIN "public"."team_seasons" "ts" ON (("ts"."id" = "tr"."team_season_id")))
          WHERE (("tr"."athlete_id" = "athlete_training_sessions"."athlete_id") AND ("ts"."program_id" = "pm"."program_id")))) OR (("athlete_training_sessions"."practice_plan_id" IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM "public"."practice_plans" "pp"
          WHERE (("pp"."id" = "athlete_training_sessions"."practice_plan_id") AND ("pp"."program_id" = "pm"."program_id"))))))))));



CREATE POLICY "delete_roster_by_membership" ON "public"."roster_athletes" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ("public"."recruits" "r"
     JOIN "public"."memberships" "m" ON (("m"."organization_id" = "r"."organization_id")))
  WHERE (("r"."id" = "roster_athletes"."recruit_id") AND ("m"."user_id" = "auth"."uid"())))));



CREATE POLICY "dev: all authenticated users can see recruits" ON "public"."recruits" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."event_definitions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "event_definitions_select_public" ON "public"."event_definitions" FOR SELECT USING (true);



CREATE POLICY "insert_roster_by_membership" ON "public"."roster_athletes" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."recruits" "r"
     JOIN "public"."memberships" "m" ON (("m"."organization_id" = "r"."organization_id")))
  WHERE (("r"."id" = "roster_athletes"."recruit_id") AND ("m"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."memberships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."practice_group_assignments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "practice_group_assignments_delete" ON "public"."practice_group_assignments" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ((("public"."practice_groups" "pg"
     JOIN "public"."practice_plans" "pp" ON (("pp"."id" = "pg"."practice_plan_id")))
     JOIN "public"."program_members" "pm" ON (("pm"."program_id" = "pp"."program_id")))
     JOIN "public"."users" "u" ON (("u"."id" = "pm"."user_id")))
  WHERE (("pg"."id" = "practice_group_assignments"."practice_group_id") AND ("u"."auth_id" = "auth"."uid"())))));



CREATE POLICY "practice_group_assignments_insert" ON "public"."practice_group_assignments" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ((("public"."practice_groups" "pg"
     JOIN "public"."practice_plans" "pp" ON (("pp"."id" = "pg"."practice_plan_id")))
     JOIN "public"."program_members" "pm" ON (("pm"."program_id" = "pp"."program_id")))
     JOIN "public"."users" "u" ON (("u"."id" = "pm"."user_id")))
  WHERE (("pg"."id" = "practice_group_assignments"."practice_group_id") AND ("u"."auth_id" = "auth"."uid"())))));



CREATE POLICY "practice_group_assignments_select_athlete" ON "public"."practice_group_assignments" FOR SELECT USING (("athlete_id" IN ( SELECT "a"."id"
   FROM ("public"."athletes" "a"
     JOIN "public"."users" "u" ON (("a"."user_id" = "u"."id")))
  WHERE ("u"."id" = "auth"."uid"()))));



CREATE POLICY "practice_group_assignments_select_dev" ON "public"."practice_group_assignments" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "practice_group_assignments_select_staff" ON "public"."practice_group_assignments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ((("public"."practice_groups" "pg"
     JOIN "public"."practice_plans" "pp" ON (("pp"."id" = "pg"."practice_plan_id")))
     JOIN "public"."program_members" "pm" ON (("pm"."program_id" = "pp"."program_id")))
     JOIN "public"."users" "u" ON (("u"."id" = "pm"."user_id")))
  WHERE (("pg"."id" = "practice_group_assignments"."practice_group_id") AND ("u"."auth_id" = "auth"."uid"())))));



CREATE POLICY "practice_group_assignments_update" ON "public"."practice_group_assignments" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ((("public"."practice_groups" "pg"
     JOIN "public"."practice_plans" "pp" ON (("pp"."id" = "pg"."practice_plan_id")))
     JOIN "public"."program_members" "pm" ON (("pm"."program_id" = "pp"."program_id")))
     JOIN "public"."users" "u" ON (("u"."id" = "pm"."user_id")))
  WHERE (("pg"."id" = "practice_group_assignments"."practice_group_id") AND ("u"."auth_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ((("public"."practice_groups" "pg"
     JOIN "public"."practice_plans" "pp" ON (("pp"."id" = "pg"."practice_plan_id")))
     JOIN "public"."program_members" "pm" ON (("pm"."program_id" = "pp"."program_id")))
     JOIN "public"."users" "u" ON (("u"."id" = "pm"."user_id")))
  WHERE (("pg"."id" = "practice_group_assignments"."practice_group_id") AND ("u"."auth_id" = "auth"."uid"())))));



ALTER TABLE "public"."practice_groups" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "practice_groups_delete" ON "public"."practice_groups" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM (("public"."practice_plans" "pp"
     JOIN "public"."program_members" "pm" ON (("pm"."program_id" = "pp"."program_id")))
     JOIN "public"."users" "u" ON (("u"."id" = "pm"."user_id")))
  WHERE (("pp"."id" = "practice_groups"."practice_plan_id") AND ("u"."auth_id" = "auth"."uid"())))));



CREATE POLICY "practice_groups_insert" ON "public"."practice_groups" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."practice_plans" "pp"
     JOIN "public"."program_members" "pm" ON (("pm"."program_id" = "pp"."program_id")))
     JOIN "public"."users" "u" ON (("u"."id" = "pm"."user_id")))
  WHERE (("pp"."id" = "practice_groups"."practice_plan_id") AND ("u"."auth_id" = "auth"."uid"())))));



CREATE POLICY "practice_groups_select" ON "public"."practice_groups" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (("public"."practice_plans" "pp"
     JOIN "public"."program_members" "pm" ON (("pm"."program_id" = "pp"."program_id")))
     JOIN "public"."users" "u" ON (("u"."id" = "pm"."user_id")))
  WHERE (("pp"."id" = "practice_groups"."practice_plan_id") AND ("u"."auth_id" = "auth"."uid"())))));



CREATE POLICY "practice_groups_select_dev" ON "public"."practice_groups" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "practice_groups_update" ON "public"."practice_groups" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM (("public"."practice_plans" "pp"
     JOIN "public"."program_members" "pm" ON (("pm"."program_id" = "pp"."program_id")))
     JOIN "public"."users" "u" ON (("u"."id" = "pm"."user_id")))
  WHERE (("pp"."id" = "practice_groups"."practice_plan_id") AND ("u"."auth_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."practice_plans" "pp"
     JOIN "public"."program_members" "pm" ON (("pm"."program_id" = "pp"."program_id")))
     JOIN "public"."users" "u" ON (("u"."id" = "pm"."user_id")))
  WHERE (("pp"."id" = "practice_groups"."practice_plan_id") AND ("u"."auth_id" = "auth"."uid"())))));



ALTER TABLE "public"."practice_plans" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "practice_plans_delete" ON "public"."practice_plans" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ("public"."program_members" "pm"
     JOIN "public"."users" "u" ON (("u"."id" = "pm"."user_id")))
  WHERE (("pm"."program_id" = "practice_plans"."program_id") AND ("u"."auth_id" = "auth"."uid"())))));



CREATE POLICY "practice_plans_insert" ON "public"."practice_plans" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."program_members" "pm"
     JOIN "public"."users" "u" ON (("u"."id" = "pm"."user_id")))
  WHERE (("pm"."program_id" = "practice_plans"."program_id") AND ("u"."auth_id" = "auth"."uid"())))));



CREATE POLICY "practice_plans_select" ON "public"."practice_plans" FOR SELECT TO "authenticated" USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "practice_plans_update" ON "public"."practice_plans" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ("public"."program_members" "pm"
     JOIN "public"."users" "u" ON (("u"."id" = "pm"."user_id")))
  WHERE (("pm"."program_id" = "practice_plans"."program_id") AND ("u"."auth_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."program_members" "pm"
     JOIN "public"."users" "u" ON (("u"."id" = "pm"."user_id")))
  WHERE (("pm"."program_id" = "practice_plans"."program_id") AND ("u"."auth_id" = "auth"."uid"())))));



CREATE POLICY "practice_plans_update_staff" ON "public"."practice_plans" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."program_members" "pm"
     JOIN "public"."users" "u" ON (("u"."id" = "pm"."user_id")))
  WHERE (("pm"."program_id" = "practice_plans"."program_id") AND ("u"."auth_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."program_members" "pm"
     JOIN "public"."users" "u" ON (("u"."id" = "pm"."user_id")))
  WHERE (("pm"."program_id" = "practice_plans"."program_id") AND ("u"."auth_id" = "auth"."uid"())))));



ALTER TABLE "public"."program_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recruits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."roster_athletes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "select_roster_by_membership" ON "public"."roster_athletes" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."recruits" "r"
     JOIN "public"."memberships" "m" ON (("m"."organization_id" = "r"."organization_id")))
  WHERE (("r"."id" = "roster_athletes"."recruit_id") AND ("m"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."training_event_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "training_event_templates_delete" ON "public"."training_event_templates" FOR DELETE USING ((("program_id" IS NOT NULL) AND ("program_id" IN ( SELECT "pm"."program_id"
   FROM "public"."program_members" "pm"
  WHERE ("pm"."user_id" = "auth"."uid"())))));



CREATE POLICY "training_event_templates_insert" ON "public"."training_event_templates" FOR INSERT WITH CHECK ((("program_id" IS NOT NULL) AND ("program_id" IN ( SELECT "pm"."program_id"
   FROM "public"."program_members" "pm"
  WHERE ("pm"."user_id" = "auth"."uid"())))));



CREATE POLICY "training_event_templates_select" ON "public"."training_event_templates" FOR SELECT USING ((("program_id" IS NULL) OR ("program_id" IN ( SELECT "pm"."program_id"
   FROM "public"."program_members" "pm"
  WHERE ("pm"."user_id" = "auth"."uid"())))));



CREATE POLICY "training_event_templates_update" ON "public"."training_event_templates" FOR UPDATE USING ((("program_id" IS NOT NULL) AND ("program_id" IN ( SELECT "pm"."program_id"
   FROM "public"."program_members" "pm"
  WHERE ("pm"."user_id" = "auth"."uid"()))))) WITH CHECK ((("program_id" IS NOT NULL) AND ("program_id" IN ( SELECT "pm"."program_id"
   FROM "public"."program_members" "pm"
  WHERE ("pm"."user_id" = "auth"."uid"())))));



CREATE POLICY "update_roster_by_membership" ON "public"."roster_athletes" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ("public"."recruits" "r"
     JOIN "public"."memberships" "m" ON (("m"."organization_id" = "r"."organization_id")))
  WHERE (("r"."id" = "roster_athletes"."recruit_id") AND ("m"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."recruits" "r"
     JOIN "public"."memberships" "m" ON (("m"."organization_id" = "r"."organization_id")))
  WHERE (("r"."id" = "roster_athletes"."recruit_id") AND ("m"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workout_steps" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workout_steps_delete" ON "public"."workout_steps" FOR DELETE USING (("workout_id" IN ( SELECT "w"."id"
   FROM ("public"."workouts" "w"
     JOIN "public"."program_members" "pm" ON (("pm"."program_id" = "w"."program_id")))
  WHERE ("pm"."user_id" = "auth"."uid"()))));



CREATE POLICY "workout_steps_insert" ON "public"."workout_steps" FOR INSERT WITH CHECK (("workout_id" IN ( SELECT "w"."id"
   FROM ("public"."workouts" "w"
     JOIN "public"."program_members" "pm" ON (("pm"."program_id" = "w"."program_id")))
  WHERE ("pm"."user_id" = "auth"."uid"()))));



CREATE POLICY "workout_steps_select" ON "public"."workout_steps" FOR SELECT USING (("workout_id" IN ( SELECT "w"."id"
   FROM ("public"."workouts" "w"
     JOIN "public"."program_members" "pm" ON (("pm"."program_id" = "w"."program_id")))
  WHERE ("pm"."user_id" = "auth"."uid"()))));



CREATE POLICY "workout_steps_update" ON "public"."workout_steps" FOR UPDATE USING (("workout_id" IN ( SELECT "w"."id"
   FROM ("public"."workouts" "w"
     JOIN "public"."program_members" "pm" ON (("pm"."program_id" = "w"."program_id")))
  WHERE ("pm"."user_id" = "auth"."uid"())))) WITH CHECK (("workout_id" IN ( SELECT "w"."id"
   FROM ("public"."workouts" "w"
     JOIN "public"."program_members" "pm" ON (("pm"."program_id" = "w"."program_id")))
  WHERE ("pm"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."workouts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workouts_delete" ON "public"."workouts" FOR DELETE USING (("program_id" IN ( SELECT "pm"."program_id"
   FROM "public"."program_members" "pm"
  WHERE ("pm"."user_id" = "auth"."uid"()))));



CREATE POLICY "workouts_insert" ON "public"."workouts" FOR INSERT WITH CHECK (("program_id" IN ( SELECT "pm"."program_id"
   FROM "public"."program_members" "pm"
  WHERE ("pm"."user_id" = "auth"."uid"()))));



CREATE POLICY "workouts_select" ON "public"."workouts" FOR SELECT USING (("program_id" IN ( SELECT "pm"."program_id"
   FROM "public"."program_members" "pm"
  WHERE ("pm"."user_id" = "auth"."uid"()))));



CREATE POLICY "workouts_update" ON "public"."workouts" FOR UPDATE USING (("program_id" IN ( SELECT "pm"."program_id"
   FROM "public"."program_members" "pm"
  WHERE ("pm"."user_id" = "auth"."uid"())))) WITH CHECK (("program_id" IN ( SELECT "pm"."program_id"
   FROM "public"."program_members" "pm"
  WHERE ("pm"."user_id" = "auth"."uid"()))));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."athlete_identity_key_strong"("first_name" "text", "last_name" "text", "date_of_birth" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."athlete_identity_key_strong"("first_name" "text", "last_name" "text", "date_of_birth" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."athlete_identity_key_strong"("first_name" "text", "last_name" "text", "date_of_birth" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."athlete_identity_key_weak"("first_name" "text", "last_name" "text", "grad_year" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."athlete_identity_key_weak"("first_name" "text", "last_name" "text", "grad_year" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."athlete_identity_key_weak"("first_name" "text", "last_name" "text", "grad_year" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."athlete_set_dob_and_upgrade_identity"("p_athlete_id" "uuid", "p_date_of_birth" "date", "p_actor_user_id" "uuid", "p_program_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."athlete_set_dob_and_upgrade_identity"("p_athlete_id" "uuid", "p_date_of_birth" "date", "p_actor_user_id" "uuid", "p_program_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."athlete_set_dob_and_upgrade_identity"("p_athlete_id" "uuid", "p_date_of_birth" "date", "p_actor_user_id" "uuid", "p_program_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."athletes_set_identity_keys_trg"() TO "anon";
GRANT ALL ON FUNCTION "public"."athletes_set_identity_keys_trg"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."athletes_set_identity_keys_trg"() TO "service_role";



GRANT ALL ON FUNCTION "public"."find_athlete_by_strong_identity"("first_name" "text", "last_name" "text", "date_of_birth" "date", "exclude_athlete_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."find_athlete_by_strong_identity"("first_name" "text", "last_name" "text", "date_of_birth" "date", "exclude_athlete_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."find_athlete_by_strong_identity"("first_name" "text", "last_name" "text", "date_of_birth" "date", "exclude_athlete_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."identity_normalize_name"("input" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."identity_normalize_name"("input" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."identity_normalize_name"("input" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."identity_sha256_hex"("input" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."identity_sha256_hex"("input" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."identity_sha256_hex"("input" "text") TO "service_role";


















GRANT ALL ON TABLE "public"."athlete_identity_events" TO "anon";
GRANT ALL ON TABLE "public"."athlete_identity_events" TO "authenticated";
GRANT ALL ON TABLE "public"."athlete_identity_events" TO "service_role";



GRANT ALL ON TABLE "public"."athlete_inquiries" TO "anon";
GRANT ALL ON TABLE "public"."athlete_inquiries" TO "authenticated";
GRANT ALL ON TABLE "public"."athlete_inquiries" TO "service_role";



GRANT ALL ON TABLE "public"."athlete_invites" TO "anon";
GRANT ALL ON TABLE "public"."athlete_invites" TO "authenticated";
GRANT ALL ON TABLE "public"."athlete_invites" TO "service_role";



GRANT ALL ON TABLE "public"."athlete_media" TO "anon";
GRANT ALL ON TABLE "public"."athlete_media" TO "authenticated";
GRANT ALL ON TABLE "public"."athlete_media" TO "service_role";



GRANT ALL ON TABLE "public"."athlete_performances" TO "anon";
GRANT ALL ON TABLE "public"."athlete_performances" TO "authenticated";
GRANT ALL ON TABLE "public"."athlete_performances" TO "service_role";



GRANT ALL ON TABLE "public"."athlete_scholarship_history" TO "anon";
GRANT ALL ON TABLE "public"."athlete_scholarship_history" TO "authenticated";
GRANT ALL ON TABLE "public"."athlete_scholarship_history" TO "service_role";



GRANT ALL ON TABLE "public"."athlete_scores" TO "anon";
GRANT ALL ON TABLE "public"."athlete_scores" TO "authenticated";
GRANT ALL ON TABLE "public"."athlete_scores" TO "service_role";



GRANT ALL ON TABLE "public"."athlete_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."athlete_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."athlete_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."athlete_training_sessions" TO "anon";
GRANT ALL ON TABLE "public"."athlete_training_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."athlete_training_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."athletes" TO "anon";
GRANT ALL ON TABLE "public"."athletes" TO "authenticated";
GRANT ALL ON TABLE "public"."athletes" TO "service_role";



GRANT ALL ON TABLE "public"."event_definitions" TO "anon";
GRANT ALL ON TABLE "public"."event_definitions" TO "authenticated";
GRANT ALL ON TABLE "public"."event_definitions" TO "service_role";



GRANT ALL ON TABLE "public"."heat_policies" TO "anon";
GRANT ALL ON TABLE "public"."heat_policies" TO "authenticated";
GRANT ALL ON TABLE "public"."heat_policies" TO "service_role";



GRANT ALL ON TABLE "public"."memberships" TO "anon";
GRANT ALL ON TABLE "public"."memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."memberships" TO "service_role";



GRANT ALL ON TABLE "public"."practice_group_assignments" TO "anon";
GRANT ALL ON TABLE "public"."practice_group_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."practice_group_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."practice_groups" TO "anon";
GRANT ALL ON TABLE "public"."practice_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."practice_groups" TO "service_role";



GRANT ALL ON TABLE "public"."practice_plans" TO "anon";
GRANT ALL ON TABLE "public"."practice_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."practice_plans" TO "service_role";



GRANT ALL ON TABLE "public"."practice_weather_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."practice_weather_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."practice_weather_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."program_athlete_scores" TO "anon";
GRANT ALL ON TABLE "public"."program_athlete_scores" TO "authenticated";
GRANT ALL ON TABLE "public"."program_athlete_scores" TO "service_role";



GRANT ALL ON TABLE "public"."program_athletes" TO "anon";
GRANT ALL ON TABLE "public"."program_athletes" TO "authenticated";
GRANT ALL ON TABLE "public"."program_athletes" TO "service_role";



GRANT ALL ON TABLE "public"."program_branding" TO "anon";
GRANT ALL ON TABLE "public"."program_branding" TO "authenticated";
GRANT ALL ON TABLE "public"."program_branding" TO "service_role";



GRANT ALL ON TABLE "public"."program_members" TO "anon";
GRANT ALL ON TABLE "public"."program_members" TO "authenticated";
GRANT ALL ON TABLE "public"."program_members" TO "service_role";



GRANT ALL ON TABLE "public"."program_recruits" TO "anon";
GRANT ALL ON TABLE "public"."program_recruits" TO "authenticated";
GRANT ALL ON TABLE "public"."program_recruits" TO "service_role";



GRANT ALL ON TABLE "public"."program_scoring_profiles" TO "anon";
GRANT ALL ON TABLE "public"."program_scoring_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."program_scoring_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."program_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."program_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."program_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."programs" TO "anon";
GRANT ALL ON TABLE "public"."programs" TO "authenticated";
GRANT ALL ON TABLE "public"."programs" TO "service_role";



GRANT ALL ON TABLE "public"."recruiting_profiles" TO "anon";
GRANT ALL ON TABLE "public"."recruiting_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."recruiting_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."recruits" TO "anon";
GRANT ALL ON TABLE "public"."recruits" TO "authenticated";
GRANT ALL ON TABLE "public"."recruits" TO "service_role";



GRANT ALL ON TABLE "public"."roster_athletes" TO "anon";
GRANT ALL ON TABLE "public"."roster_athletes" TO "authenticated";
GRANT ALL ON TABLE "public"."roster_athletes" TO "service_role";



GRANT ALL ON TABLE "public"."roster_scenario_entries" TO "anon";
GRANT ALL ON TABLE "public"."roster_scenario_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."roster_scenario_entries" TO "service_role";



GRANT ALL ON TABLE "public"."roster_scenarios" TO "anon";
GRANT ALL ON TABLE "public"."roster_scenarios" TO "authenticated";
GRANT ALL ON TABLE "public"."roster_scenarios" TO "service_role";



GRANT ALL ON TABLE "public"."schools" TO "anon";
GRANT ALL ON TABLE "public"."schools" TO "authenticated";
GRANT ALL ON TABLE "public"."schools" TO "service_role";



GRANT ALL ON TABLE "public"."season_budget_history" TO "anon";
GRANT ALL ON TABLE "public"."season_budget_history" TO "authenticated";
GRANT ALL ON TABLE "public"."season_budget_history" TO "service_role";



GRANT ALL ON TABLE "public"."team_roster" TO "anon";
GRANT ALL ON TABLE "public"."team_roster" TO "authenticated";
GRANT ALL ON TABLE "public"."team_roster" TO "service_role";



GRANT ALL ON TABLE "public"."team_roster_events" TO "anon";
GRANT ALL ON TABLE "public"."team_roster_events" TO "authenticated";
GRANT ALL ON TABLE "public"."team_roster_events" TO "service_role";



GRANT ALL ON TABLE "public"."team_seasons" TO "anon";
GRANT ALL ON TABLE "public"."team_seasons" TO "authenticated";
GRANT ALL ON TABLE "public"."team_seasons" TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";



GRANT ALL ON TABLE "public"."training_event_templates" TO "anon";
GRANT ALL ON TABLE "public"."training_event_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."training_event_templates" TO "service_role";



GRANT ALL ON TABLE "public"."transfer_portal_entries" TO "anon";
GRANT ALL ON TABLE "public"."transfer_portal_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."transfer_portal_entries" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."workout_steps" TO "anon";
GRANT ALL ON TABLE "public"."workout_steps" TO "authenticated";
GRANT ALL ON TABLE "public"."workout_steps" TO "service_role";



GRANT ALL ON TABLE "public"."workouts" TO "anon";
GRANT ALL ON TABLE "public"."workouts" TO "authenticated";
GRANT ALL ON TABLE "public"."workouts" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";


