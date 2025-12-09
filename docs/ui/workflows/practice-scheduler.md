# Practice Scheduler Workflow

This document describes the end-to-end workflow for coaches using the Practice Scheduler, aligned with the 3-layer model of training events → workouts → practice sessions.

---

## 1. Entry Points

- Main navigation: **Team Ops → Practice**
- From Team Management: “Today’s Practice” section → “Edit in Practice Scheduler”.
- From an athlete’s profile: “View assigned practices” (date-filtered).

---

## 2. Screen Layout

- **Header**
  - Team and season selector.
  - Date picker (default: today).
  - Shortcuts to “Week view” or “Monthly view”.

- **Left Pane: Calendar / List**
  - List of practice sessions for the selected date range.
  - Each item:
    - Time, location.
    - Focus (e.g., “Threshold”, “Speed”).
    - Indicator for how many groups/athletes assigned.

- **Main Pane: Practice Editor**
  - When a practice is selected:
    - Top section: core details (time, location, focus, notes, weather snapshot).
    - Middle section: group workouts.
    - Bottom: individual overrides.

---

## 3. Core Flows

### 3.1 Creating a Practice Session

1. Coach chooses team, season, and date.
2. Clicks **“Create Practice”**.
3. Fills in:
   - Start time, end time.
   - Location.
   - Focus.
   - Notes.
4. System optionally fetches weather for that date/time and location and stores a snapshot.
5. Practice session is created (future `practice_sessions` row).

---

### 3.2 Assigning Workouts to Event Groups

1. In the practice editor, coach sees a list of event groups for the team (e.g., distance, mid-distance, sprints, throws).
2. For each group, coach can:
   - Select a workout from a dropdown of `workouts`.
   - Or create a new workout using training events.

3. Creating a new workout:
   - Opens a “Workout Builder” dialog:
     - Add steps by choosing `training_events`.
     - Adjust per-step reps, distances, durations, rests.
   - On save:
     - Workout stored as `workouts` + `workout_steps`.
     - Immediately assigned to the group for that session.

4. The UI displays each group’s workout as a readable set list.

---

### 3.3 Assigning Individual Overrides

1. In the overrides section, coach can search or select athletes from the roster.
2. For each selected athlete:
   - Choose to:
     - Modify volume or intensity for the group workout.
     - Entirely replace their workout (e.g., cross-training, recovery).
3. System records overrides in `practice_assignments` (planned table).

---

### 3.4 Linking to Athlete Training Sessions

On or after practice day:

1. When practice is “published” or “executed,” system:
   - Creates or updates `athlete_training_sessions` rows for each athlete, based on:
     - Group assignment.
     - Individual overrides.
2. As athletes or coaches log completion:
   - They update the “actual” fields (`actual_distance_m`, `actual_rpe`, etc.).
3. Team Ops and Athlete Profile UIs reflect this history.

---

### 3.5 Weekly and Monthly Planning

- Week View:
  - Shows each day’s practice sessions in the week.
  - Allows copy-forward:
    - “Copy Tuesday’s workout to next Tuesday.”
- Month View:
  - Higher-level view of the training cycle (focused, e.g., on phases: base, build, peak, taper).

---

## 4. Athlete Experience

- Athletes see:
  - List of assigned practices for the upcoming days.
  - For each session:
    - Planned workout description.
    - Any personal notes from the coach.
- After completing:
  - They log actuals and subjective feedback (RPE, notes).

Access limited by RLS and role; see `/docs/security/rls-framework.md`.

---

## 5. Integration with Other Tools

- **Team Management**
  - “Today’s Practice” view sources from practice sessions.
- **Stats Manager**
  - Aggregates training volume and intensity from `athlete_training_sessions`.
- **AI**
  - Load and readiness models derive from executed training sessions.
- **Meet Manager**
  - In future, practice planning may consider upcoming meet schedule and AI recommendations.

---

## 6. Permissions

- Head Coach, Program Admin, and Director of Ops:
  - Create, edit, and delete practices and workouts.
- Assistant Coach:
  - Typically can edit practices and workouts under supervision.
- GA / Volunteer:
  - Often allowed to mark attendance and log completion, but not design workouts.
- Athletes:
  - View and update their own completion data only.
