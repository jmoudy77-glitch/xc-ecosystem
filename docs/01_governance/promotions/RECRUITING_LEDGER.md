# RECRUITING LEDGER

---

## R-0001 — Recruiting Runtime Constitution (First Edition)

**Date:** 2026-01-09  
**Type:** Constitutional Ratification  
**Scope:** Recruiting Runtime (Sovereign)  
**Upstream Dependencies:** XC-Ecosystem Kernel Constitution  
**Downstream Impact:** All Recruiting schema, logic, UI, and promotions

---

### Summary

This promotion ratifies the **Recruiting Runtime Constitution — First Edition**, formally establishing Recruiting as a sovereign runtime within the XC-Ecosystem and locking its canonical laws, boundaries, and invariants.

This entry does **not** introduce functional changes. It establishes binding law governing all future Recruiting development.

---

### Ratified Artifacts

- Recruiting Runtime Constitution (First Edition)
- Canon surfaces defined under:
  - `/docs/01_governance/modules/recruiting/ratified/*`
  - `/docs/03_domain_models/recruiting/*`
  - `/docs/04_operational_modules/recruiting/*`

---

### Constitutional Effects

- Declares Recruiting a **sovereign runtime**
- Locks **slot-centric design** as the canonical recruiting model
- Establishes **module boundary law** (`lib/modules/recruiting` as sole domain plane)
- Enforces **canonical event emission** and causal chain integrity
- Formalizes **promotion + ledger discipline** via the Triple-Lock Rule
- Locks **Recruiting Primary Surface UI invariants**
- Codifies **drift prevention law**

---

### Explicit Invariants Introduced

- Recruiting operates **only on recruitable deficits**
- Non-recruitable deficits are **constitutionally invisible**
- Recruiting is **coach-owned and non-terminal**
- AI posture is **advisory and comparative only**
- **Slots may be unoccupied, partially stabilized, or provisionally stabilized, but never bypassed**

---

### Migration

None  
(Constitutional ratification only)

---

### Schema Changes

None

---

### Notes

This ledger entry serves as the **root authority** for all subsequent Recruiting promotions.  
Any Recruiting change that violates this constitution is invalid, regardless of implementation correctness.

---

**Status:** Ratified  
**Authority:** Recruiting Runtime Constitution  
**Effective:** Immediately upon publication


## R-0002 — Pre-Constitution Recruiting Promotions Backfill

**Date:** 2026-01-09  
**Type:** Canon Backfill / Historical Ratification  
**Scope:** Recruiting Runtime  
**Upstream Dependencies:**  
- R-0001 — Recruiting Runtime Constitution (First Edition)

**Downstream Impact:** Recruiting canon history normalization

---

### Summary

This promotion backfills and formally ratifies all **Recruiting promotions implemented prior to the adoption of the Recruiting Runtime Constitution (First Edition)**.

These promotions were developed **before constitutional law was published**, but are hereby declared **canon-aligned** and valid under the now-ratified Recruiting constitutional framework.

No functional, schema, or behavioral changes are introduced by this promotion.

---

### Promotions Ratified by Reference

The following Recruiting developments are acknowledged as constitutionally compliant:

#### Stabilization (M1)
- Recruiting M1 read-only stabilization surface
- Recruitable-only deficit filtering
- Band-based stabilization status (non-terminal)
- Recruiting state signals (non-authoritative)
- No-leak enforcement for non-recruitable deficits

#### Slot-Centric Recruiting Surface
- Slot-based primary recruiting board
- Slot container UI invariants
- Athlete card interaction constraints
- Presence meter placement
- Single-row default expansion behavior

#### Discovery, Surfaced, and Favorites Pipelines
- Discovery portal as subordinate to slots
- Favorites and surfaced lists as pre-slot filters
- No bypass of slot occupancy
- Coach-confirmed actions only (no silent automation)

#### Canonical Event & Ledger Infrastructure
- Recruiting canonical event emission
- Upstream Program Health A1 causal attachment
- Recruiting ledger and candidate impact recording
- AI causal ledger usage for interpretability

---

### Constitutional Alignment Declaration

All referenced promotions are declared compliant with:

- Slot-Centric Law
- Boundary Discipline (Program Health → Recruiting)
- Canonical Event Law
- AI Advisory Posture
- Coach Ownership / Non-Terminal Doctrine
- Drift Prevention Law
- UI Invariants

Any behavior or artifact not explicitly listed above remains subject to future ratification or correction.

---

### Migration

None  
(Historical ratification only)

---

### Schema Changes

None

---

### Notes

This entry establishes a **clean constitutional baseline** for the Recruiting Runtime.

All future Recruiting promotions must:
- Reference this ledger
- Comply fully with R-0001
- Follow the Triple-Lock Rule

---

**Status:** Ratified  
**Authority:** Recruiting Runtime Constitution  
**Effective:** Immediately

## R-M3-0001 — Ratify Recruiting M3 Canon Surface
**Date:** 2026-01-10  
**Canon Surfaces:**
- /docs/01_governance/modules/recruiting/ratified/RECRUITING_M3_CANON.md

**Summary:**  
Formally ratifies Recruiting M3 as a canonical, non-authoritative candidate impact modeling surface. Establishes scope, authority boundaries, and gating rules. Confirms M3 is advisory only and may not mutate Program Health or A2 state.

**Status:** Ratified

---

## R-M3-0002 — Ratify Recruiting M3 Input Canon
**Date:** 2026-01-10  
**Canon Surfaces:**
- /docs/01_governance/modules/recruiting/ratified/RECRUITING_M3_INPUT_CANON.md

**Summary:**  
Locks the exclusive set of evidence streams permitted in M3 modeling. Defines structural alignment gates, plausibility rules, temporal constraints, program-relative context usage, and explicit prohibited inputs to prevent authority leakage.

**Status:** Ratified

---

## R-M3-0003 — Ratify Recruiting M3 Output Semantics
**Date:** 2026-01-10  
**Canon Surfaces:**
- /docs/01_governance/modules/recruiting/ratified/RECRUITING_M3_OUTPUT_SEMANTICS.md

**Summary:**  
Defines the canonical meaning and interpretation of all M3 outputs, including impact_score, cohort_tier, horizon, rationale, and inputs_hash. Strictly bounds how outputs may be consumed and forbids their use as Program Health truth.

**Status:** Ratified

---

## R-M3-0004 — Ratify Recruiting M3 Activation Gate Canon
**Date:** 2026-01-10  
**Canon Surfaces:**
- /docs/01_governance/modules/recruiting/ratified/RECRUITING_M3_ACTIVATION_GATE_CANON.md

**Summary:**  
Ratifies the Recruiting M3 Activation Gate Canon, formally defining the mandatory preconditions required before any M3 computation, persistence, or downstream consumption may occur. Explicitly prohibits partial or implicit activation and enforces Program Health isolation until a named activation promotion is applied.

**Status:** Ratified

## R-M3-0005 — Ratify Recruiting M3 Capability Node Mapping Canon
**Date:** 2026-01-10  
**Canon Surfaces:**
- /docs/01_governance/modules/recruiting/ratified/RECRUITING_M3_CAPABILITY_NODE_MAPPING_CANON.md

**Summary:**  
Ratifies the Recruiting ↔ Program Health Capability Node Mapping Canon. Establishes the exclusive, authoritative rules for mapping Recruiting event groups and athlete profiles to Program Health capability nodes for M3 modeling. Enforces constraint-type awareness, prohibits implicit inference, and satisfies Activation Gate Precondition #1.

**Status:** Ratified
