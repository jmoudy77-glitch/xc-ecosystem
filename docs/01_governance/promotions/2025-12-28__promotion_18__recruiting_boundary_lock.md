# Promotion 18 — Recruiting Canonical Boundary Lock

This promotion permanently seals the internal authority boundaries and prohibited behaviors of the Recruiting module.

## 1) Canonical role

Recruiting is the sole translation layer between Program Health (A1) and Roster Builder.

Recruiting owns:
- pipeline scoring and targeting
- commitment probability modeling
- absence mitigation strategies
- offer structure and scholarship input logic
- recruiting AI projections and prioritization

Recruiting must consume A1 outputs as canonical fact.

## 2) Prohibited behaviors

Recruiting may not:
- rewrite, reinterpret, or override A1 outputs
- perform roster construction
- issue performance diagnostics
- back-propagate corrections upstream
- embed philosophy alignment logic as gating or decision drivers

## 3) Downstream guarantees

Recruiting must expose stable, deterministic outputs for:
- roster assembly consumption
- performance audit correlation
- philosophy audit annotation

## 4) Finalization

No future feature, model, or UI surface may violate this contract.

---
## Alignment note (2026-01-03)
Recruiting governance is now ratified in `governance/modules/recruiting/genesis/module/recruiting/ratified/*`.
Where earlier language implied context visibility of non-recruitable absences inside Recruiting, the ratified Recruiting law prevails:
non-recruitable absences are invisible within Recruiting and require intentional navigation to Program Health.
