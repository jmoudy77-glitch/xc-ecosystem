# Training Schema

The Training domain covers planned and completed training activity for athletes, especially as it relates to team operations and future AI load modeling.

Currently, the core table is `athlete_training_sessions`. Future tables will expand this into a richer practice and workout model.

---

## 1. Current Table: `athlete_training_sessions`

Represents an individual training session for a specific athlete.

### 1.1 Purpose

- Provide a canonical history of what an athlete was asked to do and what they actually did.
- Support both coach-assigned and self-assigned training.
- Feed athlete profiles, Team Ops dashboards, and AI models.

### 1.2 Columns (Key)

- `id uuid` – Primary key.
- `athlete_id uuid NOT NULL`
  - FK → `athletes.id`
- `source text NOT NULL`
  - `'coach_assigned'` or `'self_assigned'`
- `coach_member_id uuid`
  - FK → `program_members.id` when `source = 'coach_assigned'`
- `team_season_id uuid`
  - FK → `team_seasons.id` if associated with a specific season.
- `scheduled_date date`
  - Planned date.
- `completed_at timestamptz`
  - When the session was actually completed (if at all).

**Planned Parameters**

- `workout_category text NOT NULL`
  - `'run'`, `'gym'`, `'cross_training'`, `'other'`
- `title text`
- `planned_description text`
- `planned_distance_m integer`
- `planned_duration_sec integer`
- `planned_rpe integer`
  - 1–10 scale.

**Actual Parameters**

- `actual_distance_m integer`
- `actual_duration_sec integer`
- `actual_rpe integer`
  - 1–10 scale.
- `actual_description text`
- `metrics_json jsonb`
  - Optional structured metrics (splits, HR, etc.).

**Timestamps**

- `created_at`, `updated_at`

### 1.3 Relationships

- `athlete_id` → `athletes.id`
- `coach_member_id` → `program_members.id`
- `team_season_id` → `team_seasons.id`

Connects Training to Athletes, Programs, and Seasons.

### 1.4 RLS Considerations

- Program staff should see sessions for athletes on their rosters.
- Athletes should see their own sessions (and can edit certain fields).
- Cross-program viewing of training sessions is generally not allowed.

See `/docs/security/rls-framework.md` for patterns.

---

## 2. Future Tables: Practice & Workout Model

The Training domain will expand as described in `/docs/team-ops/practice-scheduler.md` and `/docs/team-ops/workouts-and-training-events.md`. Proposed tables (not yet in schema):

- `training_events`
  - Atomic building blocks for workouts.
- `workouts`
  - Program-owned compositions of events.
- `workout_steps`
  - Steps within a workout.
- `practice_sessions`
  - Scheduled practices for teams.
- `practice_session_workouts`
  - Workouts assigned to event groups within a practice.
- `practice_assignments`
  - Overrides per athlete.

These tables will be the **planning layer**; `athlete_training_sessions` remains the **execution/history layer**.

---

## 3. Integration with Other Domains

- **Roster & Seasons**
  - `team_season_id` links training sessions to roster context.
- **Athlete Profile**
  - Training tab shows sessions and derived trends.
- **AI**
  - Training load and readiness models consume this data.
- **Team Ops**
  - Practice planner and S&C builder create or derive sessions here.
