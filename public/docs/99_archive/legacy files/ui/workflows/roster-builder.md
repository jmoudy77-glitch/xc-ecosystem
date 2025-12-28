# Roster Builder Workflow

This document describes the end-to-end workflow for coaches using the Season Roster Builder. It covers navigation, core use cases, and how the UI surfaces schema entities like `teams`, `team_seasons`, `team_roster`, and `roster_scenarios`.

---

## 1. Entry Points

Coaches can enter the Roster Builder from:

- Main navigation: **Team → Rosters**
- Program Dashboard: “Manage Roster” card for the current team/season.
- Links from Recruiting or Scenarios: “View in Roster Builder”.

---

## 2. Primary Use Cases

1. **View current season roster for a team**
2. **Adjust roster composition (add/remove athletes, update roles/status)**
3. **Manage scholarships and see budget usage**
4. **Create and manage roster scenarios for future seasons**

---

## 3. High-Level Screen Layout

- **Header**
  - Team selector (e.g., Men’s XC, Women’s T&F)
  - Season selector (e.g., 2025–2026, Indoor 2026)
  - Quick stats: number of athletes, scholarship used vs budget.

- **Main Content (Roster Table)**
  - One row per `team_roster` entry.
  - Columns:
    - Name (linked to Athlete Profile slide-out)
    - Event group
    - Class year
    - Role (e.g., “Scholarship”, “Walk-on”)
    - Status (active, redshirt, medical, etc.)
    - Scholarship value
    - Notes icon / preview

- **Sidebar / Filters**
  - Filter by:
    - Class year
    - Event group
    - Scholarship band
    - Status
  - Toggle between “Active Roster” and “Scenario” mode.

- **Footer / Summary Bar**
  - Total scholarship used (equivalency, amount).
  - Comparison to `team_seasons` budget fields.
  - CTA buttons for scenario planning.

---

## 4. Core Flows

### 4.1 Viewing and Filtering the Active Roster

1. Coach selects team and season from the header.
2. UI loads:
   - `team_seasons` for that team and academic year.
   - `team_roster` and linked `team_roster_events`.
3. Coach applies filters as needed.
4. Clicking an athlete’s name opens the Athlete Profile slide-out.

**Data:**

- `team_seasons.is_current` to highlight the active season.
- Derived scholarship usage vs budget.

---

### 4.2 Adding an Athlete to the Roster

1. Coach clicks **“Add Athlete”**.
2. A modal opens offering:
   - Search existing `athletes` linked to the program via `program_athletes`.
   - Optionally, create a new athlete record (if allowed).
3. Coach selects athlete and fills in:
   - Role, status.
   - Event group.
   - Scholarship fields (amount, unit).
4. Confirm writes a new `team_roster` row.

---

### 4.3 Updating Roles, Status, or Event Group

1. Coach edits fields inline (or via a slide-out editor).
2. Changes:
   - `team_roster.role`
   - `team_roster.status`
   - `team_roster.event_group`
3. If events change:
   - `team_roster_events` updates accordingly.

RLS ensures only authorized roles can perform edit operations.

---

### 4.4 Managing Scholarships

1. Coach adjusts scholarship fields per athlete:
   - `team_roster.scholarship_amount`
   - `team_roster.scholarship_unit`
   - `team_roster.scholarship_notes`
2. On save:
   - Current values in `team_roster` update.
   - A new `athlete_scholarship_history` row is created capturing old vs new state.
3. The summary bar recomputes used vs budget:
   - `team_seasons.scholarship_budget_equivalents`
   - `team_seasons.scholarship_budget_amount`

---

### 4.5 Scenario Planning

1. Coach switches to **“Scenario”** mode.
2. Selects an existing scenario or creates a new one:
   - `roster_scenarios` row for a target season.
3. The UI presents a grid similar to the active roster, but backed by:
   - `roster_scenario_entries` instead of `team_rooster`.
4. Coach can:
   - Add projected recruits (`program_recruit_id`).
   - Copy current roster entries into the scenario.
   - Adjust projected class year, role, and scholarship totals.
5. Scenario summaries:
   - Scholarship usage.
   - Event group coverage.
   - Projected roster count by class.

---

## 5. Integration with Recruiting

From a scenario or roster view, coaches can:

- Click on a projected recruit row (`program_recruit_id`) to open the Recruiting Board with that recruit highlighted.
- Add a recruit to a scenario directly from the Recruiting Board.

This reinforces the connection between **Recruiting** and **Roster Planning**.

---

## 6. Permissions

- Program Admin, Head Coach, and Director of Ops:
  - Full edit rights.
- Assistant Coach:
  - Configurable; commonly can edit roles/status but not budgets.
- GA / Volunteer:
  - Typically read-only.
- Athletes:
  - No direct access to Roster Builder; may only see their own roster status via other views.

See `/docs/security/permissions-matrix.md` for authoritative role behavior.
