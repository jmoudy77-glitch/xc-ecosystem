-- meet_manager v1.2: guard against use of __PLACEHOLDER__ enum values
-- Postgres enums are append-only; placeholders cannot be removed.
-- This migration enforces that placeholders are never persisted.

begin;

-- -------------------------------------------------------------------
-- MEETS
-- -------------------------------------------------------------------
alter table public.meets
  add constraint meets_lifecycle_state_no_placeholder_chk
  check (lifecycle_state::text <> '__PLACEHOLDER__');

-- -------------------------------------------------------------------
-- PARTICIPATION
-- -------------------------------------------------------------------
alter table public.meet_participants
  add constraint meet_participants_join_state_no_placeholder_chk
  check (join_state::text <> '__PLACEHOLDER__');

-- -------------------------------------------------------------------
-- ROSTERS / ENTRIES
-- -------------------------------------------------------------------
alter table public.meet_rosters
  add constraint meet_rosters_state_no_placeholder_chk
  check (roster_state::text <> '__PLACEHOLDER__');

alter table public.meet_entries
  add constraint meet_entries_state_no_placeholder_chk
  check (entry_state::text <> '__PLACEHOLDER__');

-- -------------------------------------------------------------------
-- EVENTS (OPTION A: ONE-HOT STATE COLUMNS)
-- -------------------------------------------------------------------
alter table public.meet_events
  add constraint meet_events_xc_state_no_placeholder_chk
  check (xc_state is null or xc_state::text <> '__PLACEHOLDER__');

alter table public.meet_events
  add constraint meet_events_tf_state_no_placeholder_chk
  check (tf_state is null or tf_state::text <> '__PLACEHOLDER__');

alter table public.meet_events
  add constraint meet_events_field_state_no_placeholder_chk
  check (field_state is null or field_state::text <> '__PLACEHOLDER__');

-- -------------------------------------------------------------------
-- RESULTS
-- -------------------------------------------------------------------
alter table public.meet_results
  add constraint meet_results_publication_state_no_placeholder_chk
  check (publication_state::text <> '__PLACEHOLDER__');

-- -------------------------------------------------------------------
-- OPS TOKENS
-- -------------------------------------------------------------------
alter table public.ops_tokens
  add constraint ops_tokens_state_no_placeholder_chk
  check (token_state::text <> '__PLACEHOLDER__');

commit;
