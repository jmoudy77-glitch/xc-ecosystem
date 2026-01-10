# RECRUITING M3 — ACTIVATION GATE CANON
## Preconditions for M3 Runtime Activation

---

### Article M3-AG-I — Purpose

The M3 Activation Gate Canon defines the **mandatory preconditions** that must be satisfied before any Recruiting M3 computation, persistence, or downstream consumption may occur.

This canon exists to ensure M3 cannot be partially, implicitly, or accidentally activated.

---

### Article M3-AG-II — Activation Definition

M3 is considered **activated** if any of the following occur:

- Emission of records into `recruiting_candidate_impacts`
- Execution of any compute logic labeled or behaving as M3
- UI or AI behavior that relies on recruit-specific absence impact deltas
- Any downstream runtime treating recruit-specific impact as actionable signal

Until activation conditions are met, M3 remains **constitutionally dormant**.

---

### Article M3-AG-III — Mandatory Preconditions (All Required)

M3 may not be activated until **all** of the following are true:

1. **Capability Node Mapping Canon Ratified**
   - Formal, documented mappings between:
     - Recruiting event groups
     - Program Health capability nodes
   - Includes handling of multi-node alignment and null alignment.

2. **Constraint-Type Contribution Rules Ratified**
   - Explicit modeling rules for:
     - coverage
     - redundancy
     - authority
     - certification
   - Each constraint type must have distinct contribution semantics.

3. **Horizon Contribution Semantics Ratified**
   - Formal rules for:
     - when a recruit may first contribute
     - horizon-limited or horizon-excluded impacts
     - multi-horizon coexistence

4. **Negative Impact Emission Rules Implemented**
   - System must be able to emit:
     - zero-impact records
     - explicit non-impact outcomes
   - Absence of impact must be representable without ambiguity.

5. **Rationale Quality Gate Enforced**
   - Automated or manual validation ensuring:
     - rationales are human-readable
     - no certainty or resolution language is present
     - rationale references approved input classes only

6. **Program Health Isolation Test Passed**
   - Verified that:
     - no M3 computation mutates Program Health tables
     - no A2 recompute is triggered by M3 execution
     - no PH UI consumes M3 as truth

7. **Explicit Activation Promotion Applied**
   - A separate, named promotion must exist:
     - “Activate Recruiting M3 Runtime”
   - Activation may not occur implicitly or incrementally.

---

### Article M3-AG-IV — Partial Activation Prohibition

Partial activation is forbidden.

Specifically prohibited:
- Computing impacts for a subset of absences
- Activating for a single program or cohort
- UI-driven “preview” computation
- AI-only activation without persistence

M3 is either fully dormant or fully activated.

---

### Article M3-AG-V — Audit & Enforcement

- Any detection of M3 activation without satisfaction of this canon constitutes a constitutional violation.
- Such violations require immediate rollback and ledger notation.

---

### Ratification

The M3 Activation Gate Canon is hereby ratified as authoritative.

No Recruiting M3 computation or activation may occur until all conditions defined herein are satisfied and an explicit activation promotion is applied.
