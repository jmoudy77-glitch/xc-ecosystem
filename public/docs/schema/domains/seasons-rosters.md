# Seasons & Rosters Schema

This document covers season definition, roster management, scholarships, events, and scenario planning.

---

## 1. Teams & Seasons

### 1.1 `teams`
Represents a gendered sport team within a program.

---

### 1.2 `team_seasons`
Defines a competitive season.

- `team_id`
- `program_id`
- `academic_year`
- `season_label`
- `is_current`, `is_active`
- Date range
- Scholarship budgets + history
- Event group quotas (future)

---

## 2. Active Roster

### 2.1 `team_roster`
Represents athletes rostered for a given season.

- `program_id`, `team_id`, `team_season_id`
- `athlete_id`
- `role`, `status`
- `event_group`
- Scholarship fields
- Links to `program_recruit_id`

---

### 2.2 `team_roster_events`
Events associated with the rostered athlete:

- `team_roster_id`
- `event_code`
- `is_primary`
- `notes`

---

## 3. Scholarship Budgeting

### 3.1 `season_budget_history`
Tracks changes in season-level scholarship budgets.

### 3.2 `athlete_scholarship_history`
Tracks changes to individual athlete scholarship numbers.

---

## 4. Scenario Planning

### 4.1 `roster_scenarios`
Scenario header for future seasons.

### 4.2 `roster_scenario_entries`
Projected athletes, roles, class years, and scholarship values.

---

## 5. Legacy Tables

### 5.1 `roster_athletes`
Deprecated early model.

---

## 6. RLS

- Programs see only rosters for seasons belonging to their program.
- Athletes see only their own roster status.
- Scenario data is program-private.

