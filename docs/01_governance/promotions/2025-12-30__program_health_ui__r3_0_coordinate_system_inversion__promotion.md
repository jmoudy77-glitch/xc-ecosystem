# Program Health UI — R3.0 Coordinate System Inversion Promotion

Purpose
- Abolish the rectangular panel container so the disc becomes the coordinate system.

Files Changed
- app/ui/program-health/ProgramHealthPage.tsx
- app/ui/program-health/CapabilityDriftMap.tsx
- app/ui/program-health/styles.css

Acceptance Checks
- The main drift instrument is no longer inside a rounded bordered panel.
- No overflow clipping: the disc can extend and visually dominate.
- The page width no longer max-width compresses the instrument.
- The disc reads as the coordinate system (field), not a diagram inside a dashboard card.
