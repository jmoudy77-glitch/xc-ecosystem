# Team Management Workflow

The Team Management Hub is the day-to-day operational view for coaches. While the Roster Builder is planning-heavy, Team Management focuses on **today**, **this week**, and the **current season**.

---

## 1. Entry Points

- Main navigation: **Team → Management**
- From Dashboard: “Today’s Team View” card.
- From other tools:
  - Clicking “Back to Team” from Practice Scheduler or Communications.

---

## 2. Screen Layout

- **Header**
  - Team + current season badges.
  - Quick metrics: roster count, injured/unavailable count, practice status.

- **Left Pane: Roster Strip**
  - Scrollable list of current-season athletes.
  - Each row:
    - Name + avatar.
    - Event group.
    - Status (icons for injury/redshirt, etc.).

- **Main Pane: Context Panel**
  - Tabbed view for:
    - Today’s practice.
    - Upcoming meets.
    - Communications.
    - Evaluations snapshots.

- **Right Slide-Out: Athlete Profile**
  - When an athlete is selected from the roster strip, the Athlete Profile opens in a slide-out.

---

## 3. Primary Use Cases

1. **View current season athletes and basic status.**
2. **Drill into a single athlete’s profile for decisions.**
3. **See today’s practice plan and attendance at a glance.**
4. **Review upcoming meets and entries.**
5. **Send quick communications to team or groups.**

---

## 4. Core Flows

### 4.1 Viewing the Active Season

1. When a coach opens Team Management:
   - The system resolves the **active team** and **current season** using `teams` + `team_seasons.is_current = true`.
2. The roster strip loads:
   - All `team_roster` rows for that `team_seasons.id`, filtered to `status = 'active'` (by default).
3. Coach can switch status filters or change seasons if needed.

---

### 4.2 Selecting an Athlete

1. Coach clicks an athlete in the roster strip.
2. Right-side slide-out opens with the Athlete Profile:
   - Overview tab by default, with quick navigation to Performance, Evaluations, etc.
3. From the slide-out, coach can:
   - Jump to full profile.
   - Open evaluation forms.
   - View recent training sessions.

Underlying data:

- `team_roster` for roster context.
- `athletes`, `athlete_performances`, `athlete_training_sessions`, `program_athlete_scores`, etc.

---

### 4.3 Today’s Practice Overview

1. Main pane shows **Today’s Practice** tab:
   - Pulls from `practice_sessions` (future table) and related workout assignments for today’s date and team.
2. Summary:
   - Start time, location, focus.
   - Groups and assigned workouts.
   - Attendance/participation (from logged `athlete_training_sessions`).

3. From here, coach can:
   - Mark attendance.
   - Drill in to see what a specific group or athlete is assigned.
   - Jump into the Practice Scheduler for deeper editing.

---

### 4.4 Upcoming Meets

1. “Upcoming Meets” tab shows a list of meets for the current team:
   - Data from future `meets` and `entries` tables.
2. Coach can:
   - See event assignments by athlete.
   - Open a meet configuration screen (Meet Manager).
   - Confirm lineups.

---

### 4.5 Communications

The “Communications” tab:

- Shows recent messages (team-wide, group, and individual) relevant to the team.
- Allows coach to:
  - Send a quick announcement to:
    - Entire team.
    - Specific event group.
    - Selected athletes.
- Communications are backed by a messages/notifications subsystem (future tables).

---

## 5. Roster vs Management Responsibilities

- Roster Builder:
  - Adjust rosters, scholarships, and multi-season planning.
- Team Management:
  - Operate the current season day-to-day.
  - See the team context for:
    - Practices.
    - Meets.
    - Communications.
    - Athlete status changes (e.g., injuries).

---

## 6. Permissions

- Program Admin / Head Coach:
  - Full access to Team Management functions.
- Assistant Coach:
  - Full or near-full access, depending on configuration.
- GA / Volunteer:
  - Typically can:
    - View roster.
    - Help record attendance and notes.
    - Not manage scholarships or billing.

See `/docs/security/permissions-matrix.md` for the detailed role breakdown.
