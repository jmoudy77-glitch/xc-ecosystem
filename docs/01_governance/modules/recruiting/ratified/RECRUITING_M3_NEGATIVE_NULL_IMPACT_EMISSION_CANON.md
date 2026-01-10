# RECRUITING M3 — NEGATIVE & NULL IMPACT EMISSION CANON
## Explicit Non-Contribution Semantics

---

### Article M3-NI-I — Purpose

This canon defines the **mandatory rules** by which Recruiting M3 must explicitly represent **non-impact**, **zero-impact**, and **inapplicability** outcomes.

Its purpose is to prevent silent optimism, false positive mitigation, and ambiguity caused by missing or suppressed impact records.

---

### Article M3-NI-II — First-Class Non-Impact Principle

Recruiting M3 explicitly recognizes **non-impact** as a first-class modeling outcome.

Failure to emit an impact record must itself be semantically meaningful and intentional.

---

### Article M3-NI-III — Canonical Non-Impact States

Recruiting M3 recognizes exactly **three non-positive states**:

1. **Null Alignment (No Record)**
   - Structural alignment is `null`
   - Canonical behavior:
     - **No impact record is emitted**
     - Consumer must interpret absence of record as “not applicable”

2. **Zero Impact (Explicit Record)**
   - Structural alignment exists
   - Plausibility or constraint rules yield no contribution
   - Canonical behavior:
     - Impact record **must be emitted**
     - `impact_score = 0`
     - `cohort_tier = Tier 0`
     - Rationale must explain *why* contribution is zero

3. **Horizon Exclusion (Selective Omission)**
   - Structural alignment exists
   - Temporal eligibility fails for a given horizon
   - Canonical behavior:
     - No record emitted **for that horizon only**
     - Records for other horizons may still exist

---

### Article M3-NI-IV — Emission Requirements

1. **Zero-impact records are mandatory**
   - Structural alignment + zero plausibility **must** emit a record
   - Silent omission is forbidden in this case

2. **Rationale is required for zero impact**
   - Must explicitly state the limiting factor
   - Must avoid speculative or future-looking language

3. **Tier consistency**
   - All zero-impact records must be Tier 0
   - Tier 0 may not be used for null alignment

---

### Article M3-NI-V — Prohibited Behaviors

The following are explicitly forbidden:

1. Suppressing zero-impact records to “clean up” UI
2. Collapsing null alignment and zero impact into one state
3. Treating absence of record as positive contribution
4. Inferring mitigation from silence
5. Auto-upgrading zero impact in later horizons without eligibility

Violation invalidates the affected impact set.

---

### Article M3-NI-VI — Consumer Interpretation Rules

Downstream consumers must interpret:

- **No record** → structurally irrelevant
- **Zero impact record** → relevant but non-contributing
- **No record at a horizon** → temporally ineligible

No other interpretation is valid.

---

### Article M3-NI-VII — Relationship to M3 Activation Gate

This canon satisfies **Precondition #4** of the M3 Activation Gate.

No M3 activation promotion may proceed without this canon being ratified.

---

### Ratification

The Recruiting M3 Negative & Null Impact Emission Canon is hereby ratified as authoritative.

All Recruiting M3 computation and consumption must conform strictly to these rules.
