# Program Health UI — Layout Contract P1 Promotion

Purpose
- Establish the canonical 2-column Program Health layout with a dominant structural plane and a sticky right rail.
- Ensure the structural plane fills the viewport height under the app header.
- Ensure the right rail scrolls internally and contains a single inspector mount region.

Files Changed
- app/ui/program-health/ProgramHealthPage.tsx
- app/ui/program-health/styles.css

What Is Now Locked
- Program Health uses a 2-column grid at large breakpoints (map left, rail right).
- Structural Plane fills remaining viewport height under the header.
- Right rail is sticky within the viewport and scrolls internally.
- Inspector content is mounted once in the rail (no duplicate inspector panels).

Acceptance Checks
- On desktop width, Program Health renders as two columns with the map left and rail right.
- The map area has no dead space below it when there are few nodes.
- The right rail stays in view and scrolls internally when it overflows.
- Only one inspector region appears in the layout.
