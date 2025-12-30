# Program Health UI — Radial Absence Voids R2 Promotion

Purpose
- Render absences as voids cut out of the radial field.

Files Changed
- app/ui/program-health/CapabilityDriftMap.tsx

What Is Now Locked
- Absences render as holes, not markers/cards.
- Severity maps to hole radius + subtle halo.
- No popovers; hover is heading only.
- No radar sweep yet (R3).

Acceptance Checks
- Absences appear as holes cut out of the radial field.
- Severity visibly changes hole size.
- Clicking a hole selects it (existing selection path).
- Hover does NOT create popovers.
- Empty state remains quiet scaffold.
