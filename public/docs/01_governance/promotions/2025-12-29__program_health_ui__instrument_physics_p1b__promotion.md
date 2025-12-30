# Program Health UI — Instrument Physics P1B Promotion

Purpose
- Enforce instrument physics: one dominant plane with a compact horizon rail below.

Files Changed
- app/ui/program-health/ProgramHealthPage.tsx
- app/ui/program-health/CapabilityDriftMap.tsx
- app/ui/program-health/HorizonTimeline.tsx

Locked Physics
- One viewport-owning drift map plane.
- One subordinate rail under the plane.
- No resident AbsencePanel, CausalityDrilldownPanel, snapshot debug, or unmapped panel.

Acceptance Checks
- The drift map plane fills the viewport height (no giant dead space).
- Only one rail exists under the plane.
- No AbsencePanel/CausalityDrilldownPanel/Snapshot debug/Unmapped Absences panels are visible by default.
- Horizon shows as a compact strip (no large dashboard cards in empty state).
