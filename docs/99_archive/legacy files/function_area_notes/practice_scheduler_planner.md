# Practice Scheduler & Practice Planner — Consolidated Notes

**Generated:** 2025-12-27
**Area:** Practice Scheduler & Planner

## Purpose
Provide a practice planning and assignment system that reduces operational friction: build practices quickly, assign groups/individuals, and keep the plan aligned with performance goals—without clicks, clutter, or uncertainty.

## What this area covers
Practice builder modal, group vs individual assignment workflows, event/workout libraries, calendar-like planning surfaces, and the weather integration concept for practice scheduling.

## Current state captured in snapshots
Snapshots describe the PracticeBuilderModal as production-ready and stable, mention removing a right-side panel, and highlight a shift away from certain drag-and-drop patterns when they reduced clarity. Weather UI behaviors are also referenced (sticky container issues above modals).

## UX and interaction patterns
Preferred pattern is a large centered modal for deep workflows, with optional inner slide-outs for advanced per-athlete assignment. Use card-click to open detail modals rather than navigate away. Drag-and-drop is used only when it reduces steps and remains unambiguous; otherwise explicit controls are favored.

## Data, entities, and integration points
Practice plans consist of sessions/events, assignments (group and individual), and links to workouts/libraries. Integration points include performance rollups (to inform what to schedule), roster membership (who can be assigned), and weather forecasts (to shape logistics and safety).

## AI and advanced analytics hooks
AI can propose practice structures based on goals, recent load, and constraints (weather, availability). The system should keep AI suggestions modular: coaches can accept, modify, or discard, with clear rationale and no hidden changes.

## Next steps and open items
Finalize the assignment interaction contract (group header controls, individual panel placement, and reversible actions). Resolve weather UI layering issues. Define a stable data schema for practice templates, events, and assignments, then add AI-assisted planning as an optional layer.

## Source files included
- 2025-12-04-snapshot.md
- 2025-12-06-snapshot.md
- 2025-12-08 snapshot.md
- 2025-12-09-snapshot.md
- 2025-12-10_snapshot.md
- 2025-12-11-snapshot.md
- 2025-12-13-snapshot.md
- 2025-12-14-snapshot.md
- 2025-12-15-snapshot.md
- 2025-12-16-snapshot.md
- 2025-12-17-snapshot.md
- 2025-12-18_snapshot.md
- 2025-12-21-snapshot.md
- 2025-12-24-session-snapshot.md
- 2025-12-26-session-snapshot.md
- 2025-12-26-snapshot.md
- Performance Module ΓÇö Actionable Clarity & UI Architecture Snapshot.md
- session-summary-2025-12-02.md

## Extracted notes (verbatim-ish)
- Returns `id`, `label`, `event_group`, `workout_id` for the given `practice_plan_id`.
- The **API surface** for practices, groups, assignments, and training sessions is consistent and secure.
- Make the **Practice Scheduler / Practice Planner** feel like it lives inside the **Training** context.
- Policies for `practice_plans`, `practice_groups`, and assignments were returning **0 rows**.
- `public.practice_plans`, `public.practice_groups`, `public.practice_group_assignments`
- Implement `practice_individual_assignments` (workouts per athlete lane).
- Hydrate workouts and assignments into practice builder edit mode.
- Links: `practice_plan_id`, `practice_group_id`, `workout_id`
- Implement `practice_group_assignments` (workouts per group).
- Hydrate workouts into PracticePlanCard popover.
- Expand workouts into practice planning
- button opens planner flow → choose team (season defaults current) → planner opens to week → choose day → build practice
- Updated `/api/practice/save` route to ensure `program_id` is included for all `athlete_training_sessions` inserts.
- 4. If `owner_id` is missing, logs a warning and skips the event (this caught earlier misconfigured sessions).
- includes `workout_id`, `step_index`, `training_event_template_id`, `exercise_id`, and `parameters_override`
- `app/api/programs/[programId]/training/practices/[practiceId]/groups/[groupId]/assignments/route.ts`
- System architecture positions us for next steps in assignments, weather logic, and practice editing.
- Insert group rows into `practice_groups` (one per group name per assigned workout or placeholder).
- Migrate “Group assignments (stub)” overlay to GlassModalShell for consistency and layering safety
- Weather sticky container appeared above modals (PracticeBuilderModal and PracticePlanCard modal)
- Group assignments drawer that pulls roster + assignments and lets coaches add/remove athletes.
- `GET /api/programs/[programId]/training/practices/[practiceId]/groups/[groupId]/assignments`
- Its `practice_groups` plus `athleteCount` per group (based on `practice_group_assignments`).
- 4. Load existing `athlete_training_sessions` for that practice/group set to avoid duplicates.
- Ensure practice calendar updates immediately on modal close (optimistic update or refetch)
- Ensure it aligns visually and structurally with the practice/session model we built today.
- Preloading working for core practice details (assignment hydration to be handled later).
- 1. Load the `practice_plans` row to get `team_season_id`, `practice_date`, and `label`.
- Group and individual workouts now insert correctly into `athlete_training_sessions`.
- `POST /api/programs/[programId]/training/practices/[practiceId]/generate-sessions`
- Fixed issue where dragging workouts/events started from “off-screen” on the right.
- Cleaned up layout to allow the calendar to expand downward around practice tiles.
- library open state no longer persists between different workout edit sessions
- PracticePlanCard modal updated to use **GlassModalShell** (portal + z-index)
- 5. For each assignment, build a new session row if one doesn’t already exist.
- **new column added:** archive flag on workouts (added during the session)
- Practice Planner updated so it **feels like you never left training**:
- Applied GLASS styling using Training / Practice Planner as reference.
- ✅ Practice Scheduler backend routes are **coherent and consistent**:
- Inserts `practice_group_assignments` rows for that practice + group.
- Add server action or caching layer to hydrate practices on calendar.
- Updated practice planner surfaces to match liquid-glass baseline:
- Ensure editing existing practices loads assignments back into UI.
- Body: `{ label, eventGroup, workoutId }` (validated with `zod`).
- Deletes matching assignments for the given `practice_group_id`.
- Fixed practice plan saving, including time formatting parsing.
- Updates `label`, `event_group`, `workout_id` (any subset).
- Inserts into `practice_plans` and returns the created row.
- Deletes group and its `practice_group_assignments` rows.
- Training page shows weekly read-only practice calendar
- 3. Load `practice_group_assignments` for those groups.
- `practice_plans.weather_snapshot`, WBGT fields, etc.
- Creates a new practice plan for a given team season:
- `practice_group_assignments` for that practice.
- (pending) `practice_individual_assignments`
- Centralized assignment logic for workouts.
- (pending) `practice_group_assignments`
- The `practice_plans` record itself.
- Insert into `practice_plans`.
- Athlete session planning
