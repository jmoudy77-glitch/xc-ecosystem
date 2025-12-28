# Roster & Scholarships — Consolidated Notes

**Generated:** 2025-12-27
**Area:** Roster & Scholarships

## Purpose
Translate recruiting decisions into an accurate, defensible roster and scholarship picture—so a coach can see commitments, allocations, remaining capacity, and what-if scenarios without manual reconciliation.

## What this area covers
Roster building, roster membership actions, scholarship budgeting/allocation concepts, and the UI/interaction patterns that reduce clicks while keeping the roster context obvious. Includes “downstream-of-recruiting” constraints and hints of budget/equivalency logic.

## Current state captured in snapshots
Snapshots reference roster context navigation, “drop-to-remove-from-roster” behavior, and downstream alignment to recruiting. There are repeated signals that scholarship tooling and roster views should be embedded into daily workflows rather than a separate spreadsheet exercise.

## UX and interaction patterns
Expect a coach-centric roster workspace: clear context (team/season), reversible actions, minimal-touch interactions, and fast roster edits. Where drag-and-drop is used, it should be deliberate and reduce steps; where it increases ambiguity, it is removed in favor of explicit controls (e.g., an “Ind” button workflow for assignments).

## Data, entities, and integration points
Key objects: roster membership, athlete identity, scholarship allocation (equivalency and/or dollar logic), and auditability (history of changes). Upstream dependencies include recruiting pipeline status and commit/intent signals; downstream consumers include performance planning, practice assignments, and program health rollups.

## AI and advanced analytics hooks
AI hooks are mainly downstream: scholarship/pipeline projections and what-if guidance should remain explainable and reversible. AI should surface options (“if you allocate X here, here’s what it does to capacity/needs”), not silently change roster decisions.

## Next steps and open items
Define the authoritative roster membership rules (who can be added/removed, prerequisites from recruiting). Specify scholarship allocation primitives and their audit log. Establish a single roster “truth view” that other modules consume. Add what-if tooling only after the base allocation model is correct.

## Source files included
- 2025-12-06-snapshot.md
- 2025-12-14-snapshot.md

## Extracted notes (verbatim-ish)
- Moved all tools (Budget, Budget Controls, What-if Calculator, Scholarship Audit) into one unified sidebar `<aside>`.
- Corrected API path mismatch (`rosterId` vs `rosterEntryId`) that caused DELETE operations to 405 on Vercel.
- Sidebar now slides out smoothly from the right and **pushes the roster left** with a pleasing transition.
- Designed from scratch with wireframed layout matching the Season Roster aesthetic.
- Added “drop-to-remove-from-roster” visual hint block in recruit panel.
- `/app/programs/[programId]/teams/[teamId]/active-roster/page.tsx`
- 5. (Optional) Add athlete navigation from roster → athlete profile
- Made all sections collapsible except the Budget summary.
- Corrected avatar cropping issues across roster cards.
- Administrative editing moves to Active Roster modal
- Active Roster modal and surfaces migrated off slate
- Title strip styled to match roster section titles.
- Replaces “Add to roster” button with “Details.”
- Roster becomes immutable in Roster Planner
- Roster Planning (draft / truth definition)
- Roster exists **only** in Roster Planner
- Active Roster vs Roster Planner contract
- Recruit card now draggable into roster.
- Quick-add disabled when roster is draft
- Advanced roster-wide comparison popover
- Roster becomes active in Active Roster
- Active Roster (execution / operations)
- Slides out leftwards over roster.
- Matches Roster slide-out system.
- directs coach to Roster Planner
- Updated shared `<Avatar/>` component behavior so uploaded images render correctly without oval masking unless explicitly requested.
- Active roster API now enforces:
- draft → `409 ROSTER_IN_DRAFT`
- Matches roster card styling.
- 🚧 Roster Planner refinement
- Scholarship (amount + unit)
- accidental roster drift
- Active roster lifecycle
- Roster close / lock UX
- Roster Planner polish
- ✅ Active Roster v1
- Historical rosters
- Active Roster:
- Added temporary link in the global header (Dashboard bar) to jump directly to a specific athlete for development:
- Roster notes
