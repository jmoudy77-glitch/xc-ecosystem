-- meet_manager v1.2: materialize authoritative enum values
-- Source of truth:
--   state_machines_v1.2.md
--   results_pipeline_contracts_v1.2.md
-- NOTE: __PLACEHOLDER__ values are left unused (Postgres enums are append-only).

begin;

-- -------------------------------------------------------------------
-- MEET / PARTICIPATION
-- -------------------------------------------------------------------

alter type mm_meet_lifecycle_state add value if not exists 'draft';
alter type mm_meet_lifecycle_state add value if not exists 'published';
alter type mm_meet_lifecycle_state add value if not exists 'completed';
alter type mm_meet_lifecycle_state add value if not exists 'cancelled';

alter type mm_participation_state add value if not exists 'invited';
alter type mm_participation_state add value if not exists 'requested';
alter type mm_participation_state add value if not exists 'approved';
alter type mm_participation_state add value if not exists 'joined';
alter type mm_participation_state add value if not exists 'rejected';
alter type mm_participation_state add value if not exists 'withdrawn';

alter type mm_roster_submission_state add value if not exists 'draft';
alter type mm_roster_submission_state add value if not exists 'submitted';
alter type mm_roster_submission_state add value if not exists 'locked';

alter type mm_entries_submission_state add value if not exists 'draft';
alter type mm_entries_submission_state add value if not exists 'submitted';
alter type mm_entries_submission_state add value if not exists 'locked';

-- -------------------------------------------------------------------
-- ATHLETE OPS
-- -------------------------------------------------------------------

alter type mm_athlete_attendance_state add value if not exists 'attending';
alter type mm_athlete_attendance_state add value if not exists 'tentative';
alter type mm_athlete_attendance_state add value if not exists 'not_attending';

-- -------------------------------------------------------------------
-- EVENT STATES (OPTION A: SEPARATE BY EVENT TYPE)
-- -------------------------------------------------------------------

alter type mm_xc_race_state add value if not exists 'not_started';
alter type mm_xc_race_state add value if not exists 'in_progress';
alter type mm_xc_race_state add value if not exists 'paused';
alter type mm_xc_race_state add value if not exists 'completed';

alter type mm_tf_event_state add value if not exists 'not_started';
alter type mm_tf_event_state add value if not exists 'in_progress';
alter type mm_tf_event_state add value if not exists 'paused';
alter type mm_tf_event_state add value if not exists 'completed';

alter type mm_field_scoring_state add value if not exists 'open';
alter type mm_field_scoring_state add value if not exists 'closed';

-- -------------------------------------------------------------------
-- LEG FLAGS
-- -------------------------------------------------------------------

alter type mm_leg_readiness_state add value if not exists 'ready';
alter type mm_leg_readiness_state add value if not exists 'not_ready';

-- -------------------------------------------------------------------
-- RESULTS PIPELINE
-- -------------------------------------------------------------------

alter type mm_results_pipeline_stage add value if not exists 'ingest';
alter type mm_results_pipeline_stage add value if not exists 'normalize';
alter type mm_results_pipeline_stage add value if not exists 'validate';
alter type mm_results_pipeline_stage add value if not exists 'provisional';
alter type mm_results_pipeline_stage add value if not exists 'published';
alter type mm_results_pipeline_stage add value if not exists 'final';
alter type mm_results_pipeline_stage add value if not exists 'revised';

alter type mm_results_publication_state add value if not exists 'provisional';
alter type mm_results_publication_state add value if not exists 'published';
alter type mm_results_publication_state add value if not exists 'final';
alter type mm_results_publication_state add value if not exists 'revised';

alter type mm_results_revision_state add value if not exists 'draft';
alter type mm_results_revision_state add value if not exists 'published_live';
alter type mm_results_revision_state add value if not exists 'published_official';
alter type mm_results_revision_state add value if not exists 'superseded';

-- -------------------------------------------------------------------
-- DISPLAY
-- -------------------------------------------------------------------

alter type mm_display_channel_state add value if not exists 'enabled';
alter type mm_display_channel_state add value if not exists 'disabled';

commit;
