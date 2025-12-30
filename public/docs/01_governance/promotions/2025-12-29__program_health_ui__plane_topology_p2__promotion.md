# Program Health UI — Plane Topology P2 Promotion

Purpose
- Establish a quiet plane topology with faint axis labels and lattice, removing instructional text.

Files Changed
- app/ui/program-health/CapabilityDriftMap.tsx

Locked Topology Rules
- Plane contains no instructional text.
- Axis labels are faint and non-intrusive.
- Lattice is present.
- Empty state reads as a quiet field.

Acceptance Checks
- No instructional paragraphs inside the plane.
- Faint axis labels visible.
- Faint lattice visible.
- Empty state shows only field + labels.
