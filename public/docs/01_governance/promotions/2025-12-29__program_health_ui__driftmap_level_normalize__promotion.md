# Program Health UI — Driftmap Level Normalize Promotion

Purpose
- Normalize 'unknown' level to a safe default for UI typing.

File Changed
- app/ui/program-health/CapabilityDriftMap.tsx

Acceptance Checks
- TypeScript build passes (no '"unknown"' assignability errors).
- Drift map page renders again.
