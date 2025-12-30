# Program Health UI — Instrument Plane P1 Promotion

Purpose
- Enforce Performance-style layout physics: one dominant instrument plane and one quiet rail below it.
- Remove resident secondary panels from the top-level layout while preserving canonical reads and modal truth reveals.

Files Changed
- app/ui/program-health/ProgramHealthPage.tsx
- app/ui/program-health/styles.css

What Is Now Locked
- Single dominant structural plane owns the viewport height under the header.
- Single subordinate horizon rail sits below the plane.
- Deep layers (AbsencePanel, CausalityDrilldownPanel, snapshot debug) are not resident in the layout.

Acceptance Checks
- Plane fills viewport under the header.
- Only Horizon rail is present below the plane.
- No AbsencePanel, CausalityDrilldownPanel, or snapshot debug visible by default.
- Empty state remains quiet (no heavy dashboard mass).
