# Recruiting Promotion Ledger

This file is the canonical, append-only ledger of all sovereign Codex promotions applied to the Recruiting module.

---

## 2026-01-03 — Recruiting Stabilization (M1) + Boundary Enforcement

- 0010 — 2026-01-03 — program_health: annotate absences with explicit recruitability classification
  - Migration: 20260103001000_program_health_absence_recruitability_annotation.sql
  - Contract linkage: Boundary + Residual Absence Awareness (Recruiting can filter explicitly)

- 0011 — 2026-01-03 — recruiting(m1): add recruitable-only deficits read model
  - Migration: 20260103001100_recruiting_read_model_view.sql
  - Surface: recruiting_recruitable_deficits (view)

- 0012 — 2026-01-03 — recruiting(m1): add RPC for recruitable deficits read model
  - Migration: 20260103001200_recruiting_read_model_rpc.sql
  - Surface: RPC read access for Recruiting M1

- 0013 — 2026-01-03 — recruiting(m1): add partial indexes for recruitable deficits
  - Migration: 20260103001300_recruiting_recruitable_deficits_indexes.sql
  - Purpose: performance + stability for recruitable-only reads

- 0014 — 2026-01-03 — recruiting(m1): add recruiting state signal table
  - Migration: 20260103001400_recruiting_state_signal_table.sql
  - Purpose: non-terminal, coach-owned state signaling (tone decay posture)

- 0015 — 2026-01-03 — recruiting(m1): add RPC for latest recruiting state signal
  - Migration: 20260103001500_recruiting_state_signal_rpc.sql
  - Surface: RLS-safe retrieval for UI posture

- 0016 — 2026-01-03 — recruiting(m2-m3): add candidate impact advisory table
  - Migration: 20260103001600_recruiting_candidate_impact_table.sql
  - Note: advisory storage only; computation/workflows follow later

- 0017 — 2026-01-03 — recruiting(m3): add RPC for ranked candidate cohorts
  - Migration: 20260103001700_recruiting_candidate_impact_rpc.sql
  - Posture: comparative/advisory only (no obligation/certainty)

- 0018 — 2026-01-03 — recruiting(security): RLS + grants (with COMMENT ON POLICY syntax fix)
  - Migration: 20260103001800_recruiting_rls_and_grants.sql
  - Purpose: enforce tenant boundary + read-only posture for M1 surfaces

- 0020 — 2026-01-03 — recruiting(m1): add deterministic horizon defaulting RPC
  - Migration: 20260103002000_recruiting_read_model_horizon_default.sql
  - Behavior: deterministic default horizon selection

- 0021 — 2026-01-03 — recruiting(m1): stabilization status RPC (aggregation fix applied)
  - Migration: 20260103002100_recruiting_stabilization_status_rpc.sql
  - Behavior: returns stabilization banding without completion semantics

- 0022 — 2026-01-03 — recruiting(m1): add validation checks for boundary enforcement
  - Migration: 20260103002200_recruiting_m1_validation_checks.sql
  - Surfaces:
    - recruiting_m1_validation_no_leak
    - rpc_recruiting_m1_validation_status_rowcount(...)

- 0023 — 2026-01-03 — recruiting(m1): add audit-only view for recruitable deficits
  - Migration: 20260103002300_recruiting_m1_read_audit_view.sql
  - Surface: recruiting_m1_audit_view

- 0024 — 2026-01-03 — recruiting(m1): seed initial stabilization state signals
  - Migration: 20260103002400_recruiting_m1_seed_state_signal.sql
  - Behavior: bootstrap state signals from current recruitable deficit counts

| 20260103165948 | recruiting | m3 | schema | recruiting_candidate_impacts schema hardening + RLS |
