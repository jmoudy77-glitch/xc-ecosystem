# Performance Runtime
## Diagnostics & Disclosure Surface Canon

---

## Article D-I — Diagnostic Authority

This canon governs how diagnostic information related to the Performance Balance Instrument is surfaced to humans.

Diagnostics observe and report system health; they never define athletic reality.

Diagnostics may not alter:
- Canonical state
- Balance semantics
- Instrument outputs
- Summary glyph derivations

---

## Article D-II — Audience Partition Law

Diagnostics are partitioned by audience:

1. Coach-Facing Diagnostics
2. Operator-Facing Diagnostics

No diagnostic surface may collapse these audiences.

---

## Article D-III — Coach-Facing Diagnostics

### Purpose
To preserve trust while signaling system confidence boundaries.

### Permitted Coach Signals
Coach-facing diagnostics MAY indicate only:
- DEGRADED (partial data, fallback mode)
- INCOMPLETE (missing canonical inputs)

Coach-facing diagnostics MUST NOT indicate:
- DRIFT
- VALIDATION FAILURE
- DERIVATION ERROR
- PERFORMANCE BUDGET VIOLATION

### Presentation Rules
- Must be non-alarming
- Must be orthogonal to balance visuals
- Must never be encoded as imbalance
- Must never alter color, amplitude, or position in the instrument

Coach diagnostics are informational only.

---

## Article D-IV — Operator-Facing Diagnostics

### Purpose
To expose canonical compliance failures for remediation and audit.

### Permitted Operator Signals
Operator-facing diagnostics MAY indicate:
- DRIFT
- VALIDATION FAILURE
- DETERMINISM VIOLATION
- PERFORMANCE BUDGET BREACH
- SNAP / INTERACTION VIOLATION
- DERIVATION MISMATCH

### Required Metadata
Each operator diagnostic MUST include:
- Canonical artifact reference (P-000x / K-000x)
- Canonical state ID(s)
- Runtime
- Timestamp
- Severity classification

---

## Article D-V — Severity Classification

Diagnostics MUST be classified as exactly one of:

- INFO
- DEGRADED
- VIOLATION
- DRIFT

### Severity Semantics
- INFO: Observational, no action required
- DEGRADED: Fallback active, semantics preserved
- VIOLATION: Canon breach detected
- DRIFT: Canonical mismatch across layers or runtimes

Severity MAY NOT be reinterpreted per surface.

---

## Article D-VI — Surface Placement Law

Diagnostics MUST:
- Never appear inside the Balance Instrument
- Never appear inside projection views
- Never appear inside the Summary Glyph

Permitted placements:
- Dedicated diagnostics drawer
- System status surfaces
- Operator dashboards

---

## Article D-VII — Degradation Disclosure Law

When degradation occurs:
- Balance semantics MUST remain intact
- Projections MAY replace volumetric rendering
- Glyph MUST remain accurate per derivation law

Coach-facing disclosure MUST state only:
“Data completeness reduced” or equivalent neutral language.

---

## Article D-VIII — Canonical Reference Law

All diagnostics MUST reference:
- Canonical state IDs
- Canonical promotion IDs governing the violated rule

No diagnostic may exist without a canonical anchor.

---

## Article D-IX — Audit Continuity Law

Diagnostics MUST be:
- Logged
- Retained
- Auditable

Diagnostics MAY NOT be:
- Mutated
- Silently suppressed
- Overwritten

Resolution occurs only via:
- Engineering correction
- Canonical promotion

---

## Canonical Summary

- Diagnostics observe, never define
- Coaches see confidence boundaries, not failures
- Operators see violations, not abstractions
- Balance truth is never polluted by system health
