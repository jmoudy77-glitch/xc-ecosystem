-- ================================================
-- XC-Ecosystem Core Dev Seed
-- - Schools
-- - Programs
-- - Users (Coaches & Athletes)
-- - Program Members
-- - Athletes
-- - Teams / Team Seasons / Roster
-- - Event Definitions
-- - Training Event Templates
-- - Workouts / Workout Steps
-- - Practice Plans / Groups / Assignments
-- - Athlete Training Sessions
-- ================================================
-- Run this as service role in dev/local.
-- All IDs are fixed UUIDs so you can reference them in tests.

-- 1) SCHOOLS ---------------------------------------------------------

insert into public.schools (id, name, level, country)
values
  ('00000000-0000-0000-0000-000000000101', 'Test University A', 'college', 'USA'),
  ('00000000-0000-0000-0000-000000000102', 'Test University B', 'college', 'USA')
on conflict (id) do nothing;


-- 2) PROGRAMS --------------------------------------------------------

insert into public.programs (id, school_id, name, sport)
values
  ('00000000-0000-0000-0000-000000000201',
   '00000000-0000-0000-0000-000000000101',
   'Program 1', 'xc'),
  ('00000000-0000-0000-0000-000000000202',
   '00000000-0000-0000-0000-000000000102',
   'Program 2', 'xc')
on conflict (id) do nothing;


-- 3) USERS (AUTH ACCOUNTS) ------------------------------------------

insert into public.users (id, auth_id, email, name)
values
  -- Coach A (Program 1)
  ('00000000-0000-0000-0000-000000000301',
   '00000000-0000-0000-0000-000000000401',
   'coachA@example.com',
   'Coach A'),
  -- Coach B (Program 2)
  ('00000000-0000-0000-0000-000000000302',
   '00000000-0000-0000-0000-000000000402',
   'coachB@example.com',
   'Coach B'),
  -- Athlete X
  ('00000000-0000-0000-0000-000000000303',
   '00000000-0000-0000-0000-000000000403',
   'athleteX@example.com',
   'Athlete X'),
  -- Athlete Y
  ('00000000-0000-0000-0000-000000000304',
   '00000000-0000-0000-0000-000000000404',
   'athleteY@example.com',
   'Athlete Y')
on conflict (id) do nothing;


-- 4) PROGRAM MEMBERS (COACHES) --------------------------------------

insert into public.program_members (id, program_id, user_id, role)
values
  -- Coach A in Program 1
  ('00000000-0000-0000-0000-000000000501',
   '00000000-0000-0000-0000-000000000201',
   '00000000-0000-0000-0000-000000000301',
   'head_coach'),
  -- Coach B in Program 2
  ('00000000-0000-0000-0000-000000000502',
   '00000000-0000-0000-0000-000000000202',
   '00000000-0000-0000-0000-000000000302',
   'head_coach')
on conflict (id) do nothing;


-- 5) ATHLETES --------------------------------------------------------

insert into public.athletes (id, user_id, first_name, last_name, grad_year, event_group)
values
  ('00000000-0000-0000-0000-000000000601',
   '00000000-0000-0000-0000-000000000303',
   'Athlete', 'X', 2026, 'distance'),
  ('00000000-0000-0000-0000-000000000602',
   '00000000-0000-0000-0000-000000000304',
   'Athlete', 'Y', 2026, 'distance')
on conflict (id) do nothing;


-- 6) TEAMS -----------------------------------------------------------

insert into public.teams (
  id, program_id, name, sport, is_primary
)
values (
  '00000000-0000-0000-0000-000000000702',
  '00000000-0000-0000-0000-000000000201',
  'Program 1 XC',
  'xc',
  true
)
on conflict (id) do nothing;


-- 7) TEAM SEASONS ----------------------------------------------------

insert into public.team_seasons (
  id, team_id, program_id, academic_year, year_start, season_label, is_current
)
values (
  '00000000-0000-0000-0000-000000000701',
  '00000000-0000-0000-0000-000000000702',
  '00000000-0000-0000-0000-000000000201',
  '2025-2026', 2025, 'XC 2025', true
)
on conflict (id) do nothing;


-- 8) TEAM ROSTER (ATHLETE X ON PROGRAM 1 XC) ------------------------

insert into public.team_roster (
  id, program_id, team_id, team_season_id, athlete_id
)
values (
  '00000000-0000-0000-0000-000000000801',
  '00000000-0000-0000-0000-000000000201',
  '00000000-0000-0000-0000-000000000702',
  '00000000-0000-0000-0000-000000000701',
  '00000000-0000-0000-0000-000000000601'
)
on conflict (id) do nothing;


-- 9) EVENT DEFINITIONS (UEM EXAMPLE) --------------------------------

insert into public.event_definitions (
  event_code, sport, category, gender, display_name, measurement_unit
)
values (
  'TFR_M_1500M', 'tfr', 'track_run', 'male', 'Men''s 1500m', 'seconds'
)
on conflict (event_code) do nothing;


-- 10) TRAINING EVENT TEMPLATES --------------------------------------

insert into public.training_event_templates (
  id, program_id, event_code, label, created_by_program_member_id
)
values (
  '00000000-0000-0000-0000-000000000901',
  '00000000-0000-0000-0000-000000000201',
  'TFR_M_1500M',
  'Threshold Repeats',
  '00000000-0000-0000-0000-000000000501'
)
on conflict (id) do nothing;


-- 11) WORKOUTS & WORKOUT STEPS --------------------------------------

insert into public.workouts (
  id, program_id, label, created_by_program_member_id
)
values (
  '00000000-0000-0000-0000-000000001001',
  '00000000-0000-0000-0000-000000000201',
  'Threshold Workout',
  '00000000-0000-0000-0000-000000000501'
)
on conflict (id) do nothing;

insert into public.workout_steps (
  id, workout_id, step_index, training_event_template_id, label
)
values (
  '00000000-0000-0000-0000-000000001101',
  '00000000-0000-0000-0000-000000001001',
  1,
  '00000000-0000-0000-0000-000000000901',
  'Main Set'
)
on conflict (id) do nothing;


-- 12) PRACTICE PLAN / GROUP / ASSIGNMENT -----------------------------

insert into public.practice_plans (
  id, program_id, team_season_id, practice_date, label, created_by_program_member_id
)
values (
  '00000000-0000-0000-0000-000000001201',
  '00000000-0000-0000-0000-000000000201',
  '00000000-0000-0000-0000-000000000701',
  current_date,
  'XC Practice',
  '00000000-0000-0000-0000-000000000501'
)
on conflict (id) do nothing;

insert into public.practice_groups (
  id, practice_plan_id, label, event_group, workout_id
)
values (
  '00000000-0000-0000-0000-000000001301',
  '00000000-0000-0000-0000-000000001201',
  'Distance',
  'distance',
  '00000000-0000-0000-0000-000000001001'
)
on conflict (id) do nothing;

insert into public.practice_group_assignments (
  id, practice_group_id, team_roster_id, athlete_id
)
values (
  '00000000-0000-0000-0000-000000001401',
  '00000000-0000-0000-0000-000000001301',
  '00000000-0000-0000-0000-000000000801',
  '00000000-0000-0000-0000-000000000601'
)
on conflict (id) do nothing;


-- 13) ATHLETE TRAINING SESSION ---------------------------------------

insert into public.athlete_training_sessions (
  id,
  athlete_id,
  source,
  coach_member_id,
  team_season_id,
  scheduled_date,
  workout_category,
  title,
  planned_description,
  practice_plan_id,
  practice_group_id,
  workout_id,
  training_event_template_id
)
values (
  '00000000-0000-0000-0000-000000001501',
  '00000000-0000-0000-0000-000000000601',
  'coach_assigned',
  '00000000-0000-0000-0000-000000000501',
  '00000000-0000-0000-0000-000000000701',
  current_date,
  'run',
  'Threshold Session',
  '5x1K @ T pace',
  '00000000-0000-0000-0000-000000001201',
  '00000000-0000-0000-0000-000000001301',
  '00000000-0000-0000-0000-000000001001',
  '00000000-0000-0000-0000-000000000901'
)
on conflict (id) do nothing;