-- ================================================
-- XC-Ecosystem Core Dev Seed Teardown
-- - Removes ONLY the test data inserted by
--   dev-seed-core-training.sql
-- ================================================

-- 1) Athlete Training Sessions --------------------

delete from public.athlete_training_sessions
where id = '00000000-0000-0000-0000-000000001501';


-- 2) Practice Assignments / Groups / Plans -------

delete from public.practice_group_assignments
where id = '00000000-0000-0000-0000-000000001401';

delete from public.practice_groups
where id = '00000000-0000-0000-0000-000000001301';

delete from public.practice_plans
where id = '00000000-0000-0000-0000-000000001201';


-- 3) Workouts & Steps ----------------------------

delete from public.workout_steps
where id = '00000000-0000-0000-0000-000000001101';

delete from public.workouts
where id = '00000000-0000-0000-0000-000000001001';


-- 4) Training Event Templates & Event Definitions

delete from public.training_event_templates
where id = '00000000-0000-0000-0000-000000000901';

delete from public.event_definitions
where event_code = 'TFR_M_1500M';


-- 5) Team Roster / Seasons / Teams ---------------

delete from public.team_roster
where id = '00000000-0000-0000-0000-000000000801';

delete from public.team_seasons
where id = '00000000-0000-0000-0000-000000000701';

delete from public.teams
where id = '00000000-0000-0000-0000-000000000702';


-- 6) Athletes ------------------------------------

delete from public.athletes
where id in (
  '00000000-0000-0000-0000-000000000601',
  '00000000-0000-0000-0000-000000000602'
);


-- 7) Program Members -----------------------------

delete from public.program_members
where id in (
  '00000000-0000-0000-0000-000000000501',
  '00000000-0000-0000-0000-000000000502'
);


-- 8) Programs ------------------------------------

delete from public.programs
where id in (
  '00000000-0000-0000-0000-000000000201',
  '00000000-0000-0000-0000-000000000202'
);


-- 9) Users ---------------------------------------

delete from public.users
where id in (
  '00000000-0000-0000-0000-000000000301',
  '00000000-0000-0000-0000-000000000302',
  '00000000-0000-0000-0000-000000000303',
  '00000000-0000-0000-0000-000000000304'
);


-- 10) Schools ------------------------------------

delete from public.schools
where id in (
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000102'
);