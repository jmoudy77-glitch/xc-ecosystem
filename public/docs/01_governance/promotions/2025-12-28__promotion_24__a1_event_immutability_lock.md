# Promotion 24 — A1 Event Immutability & Audit Trail Lock

This promotion permanently seals immutability and audit-trail requirements for A1 Absence Engine outputs and related identity events.

## 1) Immutability

A1 absence events are immutable once recorded:
- events may be appended, but never rewritten
- causal snapshots are preserved exactly as evaluated

## 2) Audit trail

All A1-related events must be:
- timestamped
- attributable to an actor and/or deterministic system evaluation
- linkable to the underlying causal inputs that produced the event

## 3) Prohibited behaviors

No module or UI surface may:
- retroactively modify A1 events
- “correct” past events by overwriting records
- hide or suppress audit-relevant events

## 4) Finalization

No future feature, model, policy, or UI surface may violate this contract.
