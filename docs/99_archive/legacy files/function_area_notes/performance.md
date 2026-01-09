# Performance Module — Consolidated Notes

**Generated:** 2025-12-27
**Area:** Performance

## Purpose
Turn performance data into actionable clarity for coaches—so they can see what is happening, why it is happening, and what to do next in-season.

## What this area covers
Performance module UI architecture, rollups and analysis concepts, training and racing context, and the “actionable clarity” principle that prevents analytics from becoming noise.

## Current state captured in snapshots
The performance snapshot explicitly frames the module as evolving from an analytical layer into an operational coaching workspace. Notes emphasize clarity, rollups, and an interface that supports decision-making rather than raw reporting.

## UX and interaction patterns
Core interaction pattern: surface the right level of summary first, then allow drilldown without disorientation. Cards and modals are used to maintain context; navigation should be predictable; and actions must be reversible and clearly communicated.

## Data, entities, and integration points
Inputs include race results, training sessions, PRs/splits, and related context (academics and wellness are referenced as adjacent dashboard elements). Outputs are rollups and insights that are consumable by practice planning and roster strategy, without mixing in Program Health philosophy alignment logic unless explicitly defined.

## AI and advanced analytics hooks
AI hooks support interpretation and prioritization: identifying meaningful trends, explaining likely drivers, and offering specific, coachable actions. The narrative emphasizes AI as a high-leverage analytical module—advanced, but subordinate to coach control and explanation.

## Next steps and open items
Lock the performance information architecture (primary dashboard, drilldown hierarchy, and where actions live). Define the canonical rollups (what gets summarized, at what cadence). Ensure performance recommendations connect cleanly into the practice planner without turning the planner into a reporting surface.

## Source files included
- 2025-12-06-snapshot.md
- 2025-12-10_snapshot.md
- 2025-12-11-snapshot.md
- 2025-12-14-snapshot.md
- 2025-12-15-snapshot.md
- 2025-12-16-snapshot.md
- 2025-12-18_snapshot.md
- 2025-12-21-snapshot.md
- 2025-12-24-session-snapshot.md
- 2025-12-26-session-snapshot.md
- Performance Module ΓÇö Actionable Clarity & UI Architecture Snapshot.md
- meet-manager.md

## Extracted notes (verbatim-ish)
- button opens planner flow → choose team (season defaults current) → planner opens to week → choose day → build practice
- `app/api/programs/[programId]/teams/[teamId]/seasons/[seasonId]/roster/add-athlete/route.ts`
- `app/programs/[programId]/teams/[teamId]/seasons/[seasonId]/practice/page.tsx`
- Removed program/season toggles — context now inherited from map.
- **Performance** added to main Program navigation
- Team-season roster duplicates prevented via:
- Program + Active Season selectors (filters)
- Program vs Performance separation
- Season performance modeling
- AI workload progression
- season PRs, trends
- Updated `/api/practice/save` route to ensure `program_id` is included for all `athlete_training_sessions` inserts.
- Final resolution was **replacing multiple conflicting policies** with a clean “program permission” policy pattern.
- Ensured athlete images retain proper aspect ratio and do not distort when used in square or rectangular frames.
- Make the **Practice Scheduler / Practice Planner** feel like it lives inside the **Training** context.
- Weather sticky container appeared above modals (PracticeBuilderModal and PracticePlanCard modal)
- Standardize visual language across practice area using the new **Liquid Glass** design protocol:
- Policies for `practice_plans`, `practice_groups`, and assignments were returning **0 rows**.
- Introduced upward state propagation (`onPanelStateChange`) to correctly sync visual context.
- Ensure practice calendar updates immediately on modal close (optimistic update or refetch)
- 2. Beginning to wire real PR, academic, percentile, training, recruiting, and wellness data
- Preloading working for core practice details (assignment hydration to be handled later).
- `public.practice_plans`, `public.practice_groups`, `public.practice_group_assignments`
- Implemented a **program‑scoped Notes MVP** with autosave and clean evolution paths
- Designed from scratch with wireframed layout matching the Season Roster aesthetic.
- Confirmed direction for a fully immersive athletic-program command center feeling.
- Cleaned up layout to allow the calendar to expand downward around practice tiles.
- Removed right-side panel + roster context navigation in the practice area layout
- **Left side:** PRs, Academics, Recruiting overview, Training snapshot, Wellness.
- Built the **Program Athletes page** using a strict **DB → API → UI** workflow
- PracticePlanCard modal updated to use **GlassModalShell** (portal + z-index)
- 2. Start wiring dynamic athlete subdata (PRs, academics, training, insights)
- Rebuilt cancel-practice API route and fixed Supabase server client import.
- Athlete name, school, location, gender, and event group presented cleanly.
- Modals portal above sticky containers and darken/blur page appropriately.
- Modal provides *just enough structure* to provoke high-quality questions.
- 3. Optional: extract shared performance-map helpers into pure utilities.
- Weather system: expand to hour-by-hour + premium Tomorrow.io features.
- Practice Planner updated so it **feels like you never left training**:
- Applied GLASS styling using Training / Practice Planner as reference.
- brand expressed via accents, rings, highlights, and subtle gradients
- Verify search filtering reliability and performance as library grows
- After policy fixes, ALL practice-related queries returned correctly.
- Continue page-by-page standardization to the liquid glass protocol:
- All primary navigation groups default to **collapsed** on page load
- `POST /api/programs/:programId/athletes/:athleteId/notes` (upsert)
- ExecutionBalanceMapPanel handles local equilibrium interpretation.
- `/app/programs/[programId]/teams/[teamId]/active-roster/page.tsx`
- Updated practice planner surfaces to match liquid-glass baseline:
- Implemented CSV-based athlete import into **team season rosters**
- Hydrate workouts and assignments into practice builder edit mode.
- Fixed bug where practice builder wouldn't reopen without refresh.
- Added simple header with team/season and placed back button there
- **`program_id` is NOT NULL** (important when we hit a save error)
- **Duplicate detection & cleanup** flow for program-owned workouts
- 5. (Optional) Add athlete navigation from roster → athlete profile
- “Add new practice” buttons updated to use brand base (not green)
- `null value in column "program_id" violates not-null constraint`
- PerformanceMapPage owns outer panel context and border styling.
- Do not design on whim — always reference prior work and intent.
