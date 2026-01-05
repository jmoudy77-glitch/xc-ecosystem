# Meet Manager — Enum Materialization Plan v1.2 (LOCKED)

**File:** `/docs/Meet_manager/enum_materialization_plan_v1.2.md`  
**Status:** Canonical (v1.2)  
**Scope:** Defines which governed enums become Postgres ENUM types vs lookup tables, and establishes naming rules and usage constraints.

---

## 0) Objectives

1. Ensure **schema stability** with minimal refactors later.
2. Keep high-churn, UI-facing labels **out of enums** (use lookup tables if needed).
3. Enforce **parity** with locked governance docs:
   - `state_machines_v1.2.md`
   - `ops_token_lifecycle_v1.2.md`
   - `results_pipeline_contracts_v1.2.md`
   - `display_feed_contracts_v1.2.md`
   - `supabase_schema_rls_v1.2.md`

---

## 1) Canonical Naming Rules

### 1.1 Type Names
- Prefix all Postgres enum types with: `mm_`
- Use snake_case: `mm_meet_lifecycle_state`

### 1.2 Value Names
- Use UPPER_SNAKE_CASE: `DRAFT`, `PUBLISHED`, `REVOKED`
- Values must match governance docs exactly.
- No UI labels inside values.

### 1.3 Column Names
- Use snake_case with `_state` or `_status` suffix:
  - `lifecycle_state`
  - `roster_state`
  - `publication_state`

### 1.4 Irreversibility
- Enums are append-only. Never remove or rename values; deprecate via application logic.

---

## 2) Materialization Decision Policy

### 2.1 Use Postgres ENUM when:
- The value set is **governance-locked**
- Changes are rare and controlled by promotion
- The enum is part of **state machine guards**

### 2.2 Use Lookup Table when:
- Values require **display labels**, ordering, or metadata (colors/icons)
- Values are likely to vary by **meet ruleset** or **organization**
- Values are not state-machine authoritative

**v1.2 Conclusion:** All state-machine authoritative values are Postgres ENUMs. UI labels and ordering are handled in the application layer or optional lookup tables (non-authoritative).

---

## 3) Authoritative Postgres ENUM Types (v1.2)

These must be created as Postgres enums and referenced directly by table columns.

### 3.1 Meet Domain
- `mm_meet_type`
  - `XC`
  - `TF`

- `mm_meet_lifecycle_state`
  - Source: `state_machines_v1.2.md` (Meet lifecycle)

### 3.2 Participation / Submission
- `mm_participation_role`
  - `HOST`
  - `ATTENDEE`

- `mm_participation_state`
  - Source: `state_machines_v1.2.md` (Participation state machine)

- `mm_roster_submission_state`
  - Source: `state_machines_v1.2.md` (Roster submission/lock state machine)

- `mm_entries_submission_state`
  - Source: `state_machines_v1.2.md` (Entries submission/lock state machine)

### 3.3 Athlete Ops
- `mm_athlete_attendance_state`
  - Source: `state_machines_v1.2.md` (attendance/check-in/scratch)

### 3.4 Event Domain
- `mm_event_type`
  - `XC`
  - `TRACK`
  - `FIELD`

- `mm_xc_race_state`
  - Source: `state_machines_v1.2.md` (XC race states)

- `mm_tf_event_state`
  - Source: `state_machines_v1.2.md` (Track & Field event states)

- `mm_field_scoring_state`
  - Source: `state_machines_v1.2.md` (Field event scoring states)

### 3.5 Leg Flags
- `mm_leg_readiness_state`
  - Source: `state_machines_v1.2.md` (leg readiness)

### 3.6 Results & Publication
- `mm_results_revision_state`
  - Source: `state_machines_v1.2.md` (results revision lifecycle)

- `mm_results_pipeline_stage`
  - Source: `results_pipeline_contracts_v1.2.md` (pipeline stages)

- `mm_results_publication_state`
  - Source: `results_pipeline_contracts_v1.2.md` (publication gates)

### 3.7 Display
- `mm_display_channel_state`
  - Source: `state_machines_v1.2.md` (display channel states)

### 3.8 Ops Tokens
- `mm_ops_token_type`
  - Source: `ops_token_lifecycle_v1.2.md` (OPS_TIMER, OPS_FIELD_SCORING, OPS_CHECKIN, OPS_SCRATCH, OPS_DISPLAY)

- `mm_ops_token_state`
  - Source: `ops_token_lifecycle_v1.2.md` (ISSUED, ACTIVE, EXPIRED, REVOKED, INVALID)

---

## 4) Optional Non-Authoritative Lookup Tables (v1.2)

These are permitted but not required for initial implementation.

- `mm_enum_labels`
  - Purpose: provide UI display label, short label, sort order, color token, icon token
  - Constraints:
    - Must not be used for guards
    - Must not be used to infer allowed transitions
    - Pure presentation metadata only

---

## 5) Enforcement Rules

1. No route handler or server action may accept arbitrary strings for state fields.
2. All writes must cast into Postgres enums at the DB boundary.
3. All state machine transitions must be validated in application logic AND guarded by DB constraints where possible.
4. Any enum addition requires:
   - governance doc change
   - schema migration adding enum value
   - promotion

---

## 6) Mapping to Schema Contract

This plan is binding for the following table columns (from `supabase_schema_rls_v1.2.md`):
- `meets.meet_type` → `mm_meet_type`
- `meets.lifecycle_state` → `mm_meet_lifecycle_state`
- `meet_participants.role` → `mm_participation_role`
- `meet_participants.join_state` → `mm_participation_state`
- `meet_rosters.roster_state` → `mm_roster_submission_state`
- `meet_entries.entry_state` → `mm_entries_submission_state` (or entry-specific enum if defined in state machines)
- `meet_events.event_type` → `mm_event_type`
- `meet_events.event_state` → `mm_tf_event_state` OR `mm_xc_race_state` OR `mm_field_scoring_state` (see schema implementation note below)
- `meet_results.publication_state` → `mm_results_publication_state`
- `ops_tokens.token_type` → `mm_ops_token_type`

### Schema Implementation Note (Event State Columns)
To avoid polymorphic enums in a single column, v1.2 physical schema must choose one of:
- A) separate state columns by event_type (preferred)
- B) a unified `mm_event_state` enum that is the union of all event state values (allowed only if it matches `state_machines_v1.2.md` and remains governance-locked)

This document locks the decision policy; the physical migration must implement A or B explicitly as part of Step 2.

---

## 7) Versioning

This enum materialization plan is **v1.2** and must remain consistent with:
- `canonical_spec_v1.2.md`
- `state_machines_v1.2.md`
- `ops_token_lifecycle_v1.2.md`
- `results_pipeline_contracts_v1.2.md`
- `display_feed_contracts_v1.2.md`
- `supabase_schema_rls_v1.2.md`

Any changes require explicit governance promotion.
