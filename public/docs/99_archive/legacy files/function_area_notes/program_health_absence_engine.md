# Program Health & Absence Engine — Consolidated Notes

**Generated:** 2025-12-27
**Area:** Program Health & Absence Engine

## Purpose
Provide an early-warning and structural integrity layer for the program: attendance/availability, continuity of training, and the conditions that degrade a season before results do.

## What this area covers
Absence/availability concepts (A1), how they roll up into Program Health, and how Program Health should inform recruiting and roster decisions without contaminating performance analysis.

## Current state captured in snapshots
The included notes reference A1/absence-related work and indicate strong boundary discipline: Program Health informs recruiting; recruiting informs roster; and performance remains focused on in-season outcomes and actionable training clarity.

## UX and interaction patterns
Program Health is a diagnostic lens that must remain simple to read and quick to act on. It should explain what changed, why it matters, and what corrective action is available—without forcing coaches into deep configuration before they can benefit.

## Data, entities, and integration points
Core signals include absence/availability events (injury, illness, missed sessions), participation consistency, and related metadata needed to interpret risk. These roll up to team/season-level Program Health indicators that become upstream inputs to recruiting and roster planning.

## AI and advanced analytics hooks
AI should detect shifts away from philosophical alignment and structural risk patterns (e.g., consistent missed work, chronic availability issues), but outputs must be explainable and tied to observable events. AI belongs as a recommendation layer, not as an opaque scoring black box.

## Next steps and open items
Publish a compact Program Health surface area for coaches (top indicators + drilldowns). Confirm the data model for absence events and rollups. Then formalize the interface to recruiting (what Program Health signals are exposed and how they influence pipeline projections).

## Source files included
- 2025-12-10_snapshot.md
- meet-manager.md

## Extracted notes (verbatim-ish)
- Automated travel plan builder
- AI injury risk analysis
- Final resolution was **replacing multiple conflicting policies** with a clean “program permission” policy pattern.
- All coaches land here after login (future: athletes → athlete page, AD → athletic department overlay).
- Resolved missing `event_group` column issue by normalizing values and aligning UI with DB enum.
- Policies for `practice_plans`, `practice_groups`, and assignments were returning **0 rows**.
- Fully wired group → individual move dialog logic (multi-step choice with optional removal).
- Preloading working for core practice details (assignment hydration to be handled later).
- Completed cancel workflow: popover → dialog → save note (ready for DB logging later).
- Added full-screen weather detail popover triggered by day panel, not heat index only.
- Group and individual workouts now insert correctly into `athlete_training_sessions`.
- **Meet creation & scheduling** (venue, host, timing integration, weather auto‑pull)
- Confirmed direction for a fully immersive athletic-program command center feeling.
- Cleaned up layout to allow the calendar to expand downward around practice tiles.
- Added loading states, safety UI, and robust handling while refreshing route.
- Rebuilt cancel-practice API route and fixed Supabase server client import.
- Weather system: expand to hour-by-hour + premium Tomorrow.io features.
- After policy fixes, ALL practice-related queries returned correctly.
- realtime results ingestion (via CSV, integration, or direct entry)
- Hydrate workouts and assignments into practice builder edit mode.
- Fixed bug where practice builder wouldn't reopen without refresh.
- Testing with "allow-all" confirmed client queries were correct.
- Fixed practice plan saving, including time formatting parsing.
- Decide login redirection logic for coaches, athletes, and ADs.
- Consolidated “Add team” form under the same branded container.
- **Performance history auto-suggestions** for event selections
- **Integration with athlete profiles** and recruiting datasets
- Generated conceptual UI image of the new program dashboard.
- Old `/dashboard` decommissioned as "account dashboard."
- Removed invalid route error caused by `await params`.
- New home becomes `/programs/[programId]/dashboard`.
- Harmonized design with program dashboard aesthetic.
- Begin Training module architecture + UI wireframes.
- Side navigation persists across all program pages.
- Discussed future AD multi-program oversight model.
- Hydrate workouts into PracticePlanCard popover.
- Action buttons (Cancel Practice, Edit Practice)
- Content mounts inside a consistent container.
- Workout library (templates, custom builder)
- Weather columns aligned with date columns.
