# UI/UX & Interaction Philosophy — Consolidated Notes

**Generated:** 2025-12-27
**Area:** UI/UX & Interaction Philosophy

## Purpose
Ensure the platform feels fast, obvious, and coach-native: minimal-touch, low learning curve, and high confidence in what actions do.

## What this area covers
Navigation shell consistency, modal-first deep workflows, drag-and-drop where it reduces steps, reversibility, and the recurring design principles captured across snapshots.

## Current state captured in snapshots
Snapshots repeatedly mention enforcing minimal-touch principles, stabilizing modal workflows, and iterating on dark-themed consistency. There are explicit examples of removing interactions (DnD on chips) when they reduced clarity.

## UX and interaction patterns
Core principles: keep context visible (where you are), make next actions self-evident, communicate consequences, and ensure reversibility. Favor large centered modals for complex workflows (e.g., practice planning). Prefer card→modal drilldown over navigation changes to prevent disorientation.

## Data, entities, and integration points
UX decisions are coupled to data clarity: the UI should reflect a stable underlying contract (DB → API → UI), avoid “magic” implicit state, and make state transitions (add/remove/assign) explicit and auditable.

## AI and advanced analytics hooks
AI should respect the same UX principles: explain actions, show why, allow reversibility, and keep control with the coach. AI should not introduce hidden state transitions that violate trust.

## Next steps and open items
Codify the UI Intuition Checklist into a reusable rubric for feature reviews. Standardize modal patterns and interaction contracts across modules. Maintain a single navigation shell unless intentionally creating a compact variant later.

## Source files included
- 2025-12-06-snapshot.md
- 2025-12-08 snapshot.md
- 2025-12-09-snapshot.md
- 2025-12-10_snapshot.md
- 2025-12-12-snapshot.md
- 2025-12-14-snapshot.md
- 2025-12-15-snapshot.md
- 2025-12-16-snapshot.md
- 2025-12-17-snapshot.md
- 2025-12-18_snapshot.md
- 2025-12-19_snapshot.md
- 2025-12-21-snapshot.md
- 2025-12-24-session-snapshot.md
- 2025-12-26-session-snapshot.md
- 2025-12-26-snapshot.md
- Performance Module ΓÇö Actionable Clarity & UI Architecture Snapshot.md
- session-summary-2025-12-02.md

## Extracted notes (verbatim-ish)
- Enforcement of minimal-touch + intuitive UI principles
- Weather sticky container appeared above modals (PracticeBuilderModal and PracticePlanCard modal)
- Rebuilt athlete handling to remove DnD from chips and replaced with **Ind** button workflow.
- Dark-themed UI now consistent across **layout, dashboard, billing, and staff pages**.
- Removed right-side panel + roster context navigation in the practice area layout
- Built the **Program Athletes page** using a strict **DB → API → UI** workflow
- Added “drop-to-remove-from-roster” visual hint block in recruit panel.
- Modal flow mirrors map page top → bottom for cognitive continuity.
- Brainstorm Modal: scaffolded and ready for structured build-out.
- The practice builder modal is now production-ready and stable.
- No drag-and-drop (intentionally removed for clarity & speed)
- Card click opens workout **detail modal** (not navigation)
- UX is dramatically improved with clear athlete workflows.
- UI presents a **side-by-side candidate modal**.
- Shared UI: `/component/ui/GlassModalShell.tsx`
- Modal‑first UX is the correct default for:
- Path: `/component/ui/GlassModalShell.tsx`
- Recruit card now draggable into roster.
- Reorder buttons and drag/drop:
- `PracticeBuilderModal.tsx`
- `PracticeBuilderModal`
- button opens planner flow → choose team (season defaults current) → planner opens to week → choose day → build practice
- Minimal-touch UI
- Moved all tools (Budget, Budget Controls, What-if Calculator, Scholarship Audit) into one unified sidebar `<aside>`.
- coach-intuitive
- UI layout:
- Sidebar now slides out smoothly from the right and **pushes the roster left** with a pleasing transition.
- limited modal height and made **steps container scrollable** (instead of stretching the entire modal)
- Migrate “Group assignments (stub)” overlay to GlassModalShell for consistency and layering safety
- Standardize visual language across practice area using the new **Liquid Glass** design protocol:
- Embedded **miniature balance field** (≈75% height) inside narrative panel for visual continuity.
- Resolved missing `event_group` column issue by normalizing values and aligning UI with DB enum.
- Long-form explanations may appear as draggable/resizable text objects instead of chat bubbles.
- Triggers a confirmation modal asking whether athlete should be excluded from group workouts.
- Ensure practice calendar updates immediately on modal close (optimistic update or refetch)
- Ensure it aligns visually and structurally with the practice/session model we built today.
- 2. Beginning to wire real PR, academic, percentile, training, recruiting, and wellness data
- Fix workflow gaps in workouts (duplicates, archive/delete, add/remove/reorder steps).
- Ensured planner keeps the **weather layout exactly as-is** but expanded to fill space
- Completed cancel workflow: popover → dialog → save note (ready for DB logging later).
- Fixed issue where dragging workouts/events started from “off-screen” on the right.
- Designed from scratch with wireframed layout matching the Season Roster aesthetic.
- Cleaned up layout to allow the calendar to expand downward around practice tiles.
- **Left side:** PRs, Academics, Recruiting overview, Training snapshot, Wellness.
- Successfully wired **statement panel color tokens** based on equilibrium state.
- Improved highlighting logic and corrected how panels indicate droppable areas.
- “Something appears to be pulling your competitive system out of equilibrium.”
- Finish the **Workout steps editor** workflow so coaches never touch raw JSON.
- Cleaned up transition bug where recruit boxes were flying in from the bottom.
- PracticePlanCard modal updated to use **GlassModalShell** (portal + z-index)
- Established a **canonical UI surface system** aligned with the Training page
- Ensured the modal can be saved regardless of empty times or optional fields.
- Added loading states, safety UI, and robust handling while refreshing route.
- 5. For each assignment, build a new session row if one doesn’t already exist.
- steps added during edit are discarded if modal closed/canceled without save
- Individuals panel now behaves entirely independently from group droppables.
- Rebuilt cancel-practice API route and fixed Supabase server client import.
- `label` is **NOT NULL** → modal now ensures a default is always provided.
- Supports both group override and individual override via normal workflow.
- Modals portal above sticky containers and darken/blur page appropriately.
