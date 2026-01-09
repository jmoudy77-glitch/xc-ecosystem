
## Canvas-Oriented Plane Evolution Protocol (Program Health)
- Canvas is the working authority surface for Program Health plane decisions.
- Repo docs are the published canonical record.
- Code implements the published record; code is never the origin of geometry decisions.

Every geometry/topology change must follow:
1. Canvas delta entry (append-only)
2. Mirror into `docs/canonical_planes/program_health_plane.md`
3. Code change(s)
4. Single commit containing (2) + (3) + promotion record (if used)

## Program Health — Append-Only Delta Ledger (External)
All Program Health plane deltas must be recorded in:
- `docs/canonical_planes/program_health_plane_deltas.md`

Rules:
- Append-only entries (no edits, no reorders)
- Each delta must reference the promotion ID and date

## Program Health — External Delta Ledger (Append-Only)
All spatial/topology deltas for Program Health must be recorded first in:
docs/canonical_planes/program_health_plane_deltas.md

Procedure:
1) Append delta to the external ledger
2) Mirror into docs/canonical_planes/program_health_plane.md
3) Apply code changes
4) Commit spec + code + promotion record together
