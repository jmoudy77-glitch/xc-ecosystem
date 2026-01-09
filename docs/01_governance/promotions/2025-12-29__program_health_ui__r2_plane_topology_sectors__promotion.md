# Program Health UI — R2 Plane Topology Sectors Promotion

Purpose
- Replace rectangular grid topology with 6 fixed canonical sectors.

Deterministic Assignment
- hash(node.id) % 6

Files Changed
- app/ui/program-health/CapabilityDriftMap.tsx

Acceptance Checks
- Rectangular grid is gone (no lattice rows/cols).
- Capability plates now orbit in 6 radial sectors.
- R2 SECTORS LIVE stamp visible.
- Clicking a hole still selects (no behavior regression).
