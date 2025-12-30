# Program Health UI — Left Shelf Selection P2 Promotion

Purpose
- Introduce hover heading and left context shelf selection without adding competing panels.

Files Changed
- app/ui/program-health/ProgramHealthPage.tsx
- app/ui/program-health/CapabilityDriftMap.tsx

Locked Interaction Rules
- Hover = one-line heading only.
- Click = reveal details in left shelf under program menu.
- No popovers.
- No resident inspector panels.

Acceptance Checks
- Hover never produces a large UI element.
- Click reveals left shelf under program menu.
- Plane remains dominant; rail remains subordinate.
- No AbsencePanel/CausalityDrilldownPanel visible by default.
