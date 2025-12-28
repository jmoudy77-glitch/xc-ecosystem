# Promotion 31 — Practice Execution Canonical Lock

This promotion permanently seals practice execution as a canonical execution-layer function.

## 1) Canonical practice execution role

Practice execution owns:
- practice session instantiation
- workout and event sequencing
- athlete assignment to sessions
- attendance capture
- completion and compliance logging

## 2) Structural guarantees

All practice execution records must be:
- attributable to coach action logs
- timestamped and immutable
- auditable against roster and compliance layers

## 3) Prohibited behaviors

Practice execution may not:
- embed recruiting logic
- embed performance diagnostics as causal drivers
- issue recommendations

## 4) Finalization

No future practice feature, model, or UI surface may violate this contract.
