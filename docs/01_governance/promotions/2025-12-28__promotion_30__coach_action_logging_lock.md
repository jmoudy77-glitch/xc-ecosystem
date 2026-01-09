# Promotion 30 — Coach Action Logging Canonical Lock

This promotion permanently seals coach action logging as a canonical execution-layer function.

## 1) Canonical logging role

All coach-initiated actions that affect:
- recruiting
- roster construction
- scholarship offers
- athlete assignments
- practice scheduling
- meet operations
- compliance actions

must be logged as immutable action records.

## 2) Structural guarantees

All action logs must include:
- actor identity
- timestamp
- causal module origin
- affected entity references
- before/after state snapshots

## 3) Prohibited behaviors

No execution-layer module may:
- perform unlogged actions
- overwrite or suppress action logs
- backfill or retroactively modify action records

## 4) Finalization

No future execution feature, model, or UI surface may violate this contract.
