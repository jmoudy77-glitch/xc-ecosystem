# Recruiting Domain Model
**Authority Level:** Domain Model (binding)  
**Purpose:** Canonical meaning for recruiting stabilization + pipeline, and their bounded relationship to Program Health.

---

## 1. Definition
Recruiting is the domain that structures how a program:
1) **stabilizes recruitable roster risk** (recruitable deficits only), and
2) discovers, evaluates, engages, and converts prospective athletes into rostered athletes.

Recruiting is downstream of Program Health (diagnostic authority) and upstream of roster composition/allocation.

---

## 2. Canonical contracts (binding)
1) Recruiting operates exclusively on **recruitable** deficits.
2) Non-recruitable deficits are invisible in Recruiting.
3) Recruiting is coach-owned and non-terminal (no “done”).
4) AI posture is comparative/advisory only.
5) Primary coach mental model is **stabilization** (slot filling as mechanic).

---

## 3. Stabilization subdomain (M1 surface)
### 3.1 Recruitable Deficit
A recruitable deficit is a Program Health absence that is explicitly classified as:
- `details.recruitability = 'recruitable'`

Recruiting may only read and act on recruitable deficits. The absence object may carry:
- `absence_key`
- `capability_node_id`
- `sector_key`
- `severity`
- `horizon`
- `details` (bounded; no non-recruitable inference)

### 3.2 Stabilization Status (banding)
Recruiting surfaces stabilization status as **bands** (not completion):
- within tolerances
- approaching boundary
- outside tolerance

Band thresholds are policy-configurable, but semantics are invariant:
- bands are advisory posture, not “solved/complete”
- strongest outward claim: “Recruitable risk is within defined tolerances.”

### 3.3 Recruiting State Signal
A recruiting state signal is a non-authoritative record used for:
- tone decay / silence behavior
- stabilizing posture persistence
- UI continuity

State signals do not mutate Program Health.

---

## 4. Pipeline entities (canonical)
### 4.1 Recruit (Athlete-in-Pipeline)
A recruit is an athlete represented in a program’s recruiting pipeline.

### 4.2 Recruit Board Item
Operational container for:
- priority, tags/notes, ownership
- next action + due dates
- warnings and missing information

### 4.3 Evaluation Artifact
Structured assessment of fit and potential including:
- qualitative notes
- performance inputs (facts)
- coachable metric (where available)
- fit signals

### 4.4 Contact / Interaction Event
Attributable record of contact attempts and outcomes.

---

## 5. Stored facts vs derived analytics
### 5.1 Must be stored (facts)
- pipeline state transitions + attribution
- evaluation inputs (notes, results refs, structured ratings)
- contact events + outcomes
- commitment confirmations + attribution

### 5.2 Must be derived (analytics)
- Scout Score (bounded; interpretable)
- Commit Probability (forecast with uncertainty)
- Pipeline Projection (cohort gap forecast)

All derived analytics must store provenance: inputs, version, timestamps, confidence.

---

## 6. Canonical invariants
1) **Boundary discipline:** Recruiting does not own Program Health truth.
2) **No leak:** non-recruitable deficits are invisible in Recruiting.
3) **Attribution:** actions and state transitions are attributable.
4) **Interpretability:** scores are never displayed without rationale.
5) **No silent automation:** AI may recommend; humans confirm.

---

## 7. References
- `03_domain_models/program_health_domain.md`
- `04_operational_modules/recruiting.md`
- `05_ai_systems/*`
