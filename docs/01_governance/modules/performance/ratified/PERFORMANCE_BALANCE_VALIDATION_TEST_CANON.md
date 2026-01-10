# Performance Balance Instrument
## Validation & Test Canon

---

## Article B-XXX — Validation Authority

Validation enforces canonical compliance for:
- P-0001 (Layer Model)
- P-0002 (Projection Interaction Law)
- P-0003 (Derivation Law)
- P-0004 (Implementation Spec)

Validation must detect drift, violations, and non-determinism.
Validation may never “correct” truth; it may only detect and report.

---

## Article B-XXXI — Compliance Test Classes

Exactly four compliance test classes are required:

1. Structural Compliance Tests (Layer Boundaries)
2. Interaction Compliance Tests (Projection Authority)
3. Derivation Compliance Tests (Model → Glyph)
4. Determinism & Parity Tests (Single-Source Integrity)

No test class may be omitted.

---

## Article B-XXXII — Structural Compliance Tests

### Required Assertions

1. Volumetric layer registers no pointer events
   - No click, hover, selection, drag, or scroll binding
2. Projection layers are the only interactive surfaces
3. Overlays never render in volumetric state
4. Projection states render only within snap thresholds

### Failure Severity
Any failure in this class is CRITICAL.

---

## Article B-XXXIII — Interaction Compliance Tests

### End-On Projection (Snapshot Mode)
Required assertions:
- Scroll advances temporal index only
- Temporal changes are discrete steps (no continuous scrub)
- Dichotomy index remains fixed
- Volumetric rendering suppressed

### Side-On Projection (Temporal Mode)
Required assertions:
- Scroll cycles dichotomy only
- Temporal index remains fixed
- No time scrubbing is possible
- Volumetric rendering suppressed

### Mutual Exclusivity
End-On and Side-On interaction paths must not share handlers.

### Failure Severity
Any failure in this class is CRITICAL.

---

## Article B-XXXIV — Derivation Compliance Tests

### Canonical Inputs
All derivation tests must use only:
- D (dichotomies)
- T (temporal indices)
- s(d,t) (signed displacement)

### Required Assertions

1. Per-dichotomy magnitude correctness at t0
   - m(d) = |s(d,t0)|
2. Direction correctness at t0
   - ABOVE / BELOW / BALANCED derived solely from sign of s(d,t0)
3. Quantization tier correctness
   - Five tiers exactly (Q0..Q4)
   - Thresholds fixed and stable
4. Global aggregation correctness
   - G = Σ |s(d,t0)|
   - NET derived from Σ s(d,t0)
5. Volatility flag constraints (if implemented)
   - Uses fixed W sample window including t0
   - Output is categorical only
   - Display remains non-historical

### Failure Severity
Any failure in this class is HIGH.
If it causes glyph/model mismatch in production, treat as CRITICAL.

---

## Article B-XXXV — Determinism & Parity Tests

### Determinism
For identical canonical inputs, the following must be identical:
- Volumetric geometry outputs (within defined float tolerance)
- Projection outputs
- Glyph derived outputs

### Parity
Projection values must equal volumetric source values at corresponding indices.

Glyph values must equal derivation outputs from volumetric source at t0.

### Tolerance Law
- Float tolerance must be fixed and versioned.
- Tolerance may not vary by device or frame rate.

### Failure Severity
Any failure in this class is CRITICAL.

---

## Article B-XXXVI — Performance Budget Tests

Budgets from P-0004 must be tested and enforced:

- Initial activation ≤ 200ms baseline
- Rotation ≥ 45 FPS baseline
- Snap transition ≤ 120ms
- Step transitions ≤ 80ms

If budgets are not met:
- Degradation must occur per P-0004
- Semantics must remain intact

### Failure Severity
Any failure in this class is HIGH.
Repeated failures across environments are CRITICAL.

---

## Article B-XXXVII — CI Gating Law

The canonical test suite MUST gate:
- merges into main
- release builds

At minimum, gating requires:
- all CRITICAL tests pass
- no HIGH failures unacknowledged

Any override requires an explicit promotion or a Kernel-authorized emergency procedure.

---

## Article B-XXXVIII — Drift Incident Classification

Any detected mismatch between:
- Volumetric state at t0
and
- Glyph derived at t0
is classified as DRIFT.

DRIFT incidents must:
- create an auditable diagnostic entry
- be corrected only through promotion

---

## Canonical Summary

- Tests enforce canon, not preference
- Interaction is projection-only
- Derivation is fixed and auditable
- Parity is mandatory
- CI gating prevents drift from shipping
