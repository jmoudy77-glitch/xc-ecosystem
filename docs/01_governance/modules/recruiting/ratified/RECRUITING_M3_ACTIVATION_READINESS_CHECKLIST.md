# RECRUITING M3 — ACTIVATION READINESS CHECKLIST
## Required Proofs Prior to Applying R-M3-0011

---

## Purpose

This checklist defines the **mandatory, verifiable proofs** required before the **R-M3-0011 — Activate Recruiting M3 Runtime** promotion may be applied.

It operationalizes the M3 Activation Gate Canons into concrete engineering, testing, and governance evidence.

Application of R-M3-0011 without satisfying every item in this checklist constitutes a constitutional violation.

---

## Checklist Structure

Each requirement includes:
- **Requirement**
- **Evidence Required**
- **Validation Method**
- **Pass Criteria**

All items must be marked **PASS**.

---

## 1. Capability Node Mapping Implementation

**Requirement**
- Recruiting → Program Health capability node mappings are implemented exactly as ratified.

**Evidence Required**
- Mapping configuration file(s) or table(s)
- Version identifier tied to canon version

**Validation Method**
- Static review against `RECRUITING_M3_CAPABILITY_NODE_MAPPING_CANON.md`
- Automated test asserting:
  - no implicit mappings
  - no null → primary promotion
  - constraint-type compatibility enforced

**Pass Criteria**
- All mappings are explicit, auditable, and canon-compliant.

---

## 2. Constraint-Type Contribution Logic

**Requirement**
- Distinct modeling logic exists for:
  - coverage
  - redundancy
  - authority
  - certification

**Evidence Required**
- Source code paths per constraint type
- Unit tests per constraint

**Validation Method**
- Unit tests asserting:
  - no cross-constraint reuse
  - authority/certification require explicit evidence
  - redundancy capped below coverage

**Pass Criteria**
- All constraint-specific rules enforced and isolated.

---

## 3. Horizon Eligibility & Contribution Gating

**Requirement**
- Horizon eligibility gates enforced exactly as ratified.

**Evidence Required**
- Horizon gating logic
- Test fixtures covering H0–H3 scenarios

**Validation Method**
- Tests asserting:
  - no forward acceleration
  - selective horizon omission allowed
  - multi-horizon coexistence supported

**Pass Criteria**
- No impact emitted at ineligible horizons.

---

## 4. Negative & Null Impact Emission

**Requirement**
- Non-impact states are explicitly and correctly represented.

**Evidence Required**
- Emission logic for:
  - null alignment (no record)
  - zero impact (Tier 0 record)
  - horizon exclusion

**Validation Method**
- Tests asserting:
  - zero-impact records are emitted when required
  - null alignment emits no record
  - silence is never interpreted as positive impact

**Pass Criteria**
- Non-impact semantics are unambiguous and enforced.

---

## 5. Rationale Quality Enforcement

**Requirement**
- All M3 impact records require a canon-compliant rationale.

**Evidence Required**
- Rationale validation rules
- Example valid and invalid rationales

**Validation Method**
- Automated lint or validation tests asserting:
  - required components present
  - forbidden language rejected
  - conditional language enforced

**Pass Criteria**
- No impact record can persist without a valid rationale.

---

## 6. Program Health Isolation

**Requirement**
- M3 is fully isolated from Program Health canonical state.

**Evidence Required**
- Database permissions configuration
- Event / job wiring diagrams

**Validation Method**
- Tests asserting:
  - no write access to PH tables
  - no A2 recomputation triggers
  - PH UI defaults to canonical reality

**Pass Criteria**
- Zero mutation or dependency on Program Health truth.

---

## 7. Audit & Provenance Logging

**Requirement**
- All M3 computations are auditable and reproducible.

**Evidence Required**
- Logging of:
  - model version
  - inputs_hash
  - execution timestamp

**Validation Method**
- Test replay of identical inputs produces identical outputs

**Pass Criteria**
- Full determinism and traceability.

---

## 8. UI Guardrails (Pre-Activation)

**Requirement**
- No UI depends on M3 prior to activation.

**Evidence Required**
- Feature flags or guards
- UI tests

**Validation Method**
- Tests asserting:
  - M3-inactive state renders safely
  - no recruit-specific absence deltas visible

**Pass Criteria**
- UI remains truthful and stable with M3 inactive.

---

## 9. Activation Dry Run

**Requirement**
- M3 logic can be executed in dry-run mode.

**Evidence Required**
- Dry-run execution logs
- No persistence side effects

**Validation Method**
- Execute M3 computation with persistence disabled

**Pass Criteria**
- Outputs generated, nothing written.

---

## 10. Governance Sign-Off

**Requirement**
- Explicit acknowledgement that all checklist items passed.

**Evidence Required**
- Signed-off checklist (human or system)
- Reference to this document version

**Validation Method**
- Manual verification

**Pass Criteria**
- Governance approval recorded.

---

## Final Activation Rule

Only after **all 10 items pass** may the following occur:
- Application of **R-M3-0011**
- Enabling of M3 computation
- Writing to `recruiting_candidate_impacts`

Until then, M3 remains **constitutionally dormant**.

---

## Status

**Checklist Complete:** ☐ NO / ☐ YES  
**R-M3-0011 Eligible:** ☐ NO / ☐ YES
