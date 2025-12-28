# Recruiting Domain Model
**Authority Level:** Domain Model (binding)  
**Purpose:** Canonical meaning for recruiting pipeline, boards, evaluations, and commitments.

---

## 1. Definition
**Recruiting** is the domain that structures how a program discovers, evaluates, engages, and converts prospective athletes into rostered athletes.

Recruiting is downstream of Program Health (constraints and risk posture) and upstream of Roster-building (composition and allocations).

---

## 2. Core Entities (Canonical)
### 2.1 Recruit (Athlete-in-Pipeline)
A recruit is an athlete represented in a program’s recruiting pipeline, regardless of whether they are already known to the platform.

A recruit record includes:
- linkage to Athlete identity where possible
- pipeline state (see `02_architecture/state_transitions.md`)
- recruitment context (graduation year, primary events, geography)
- evaluation artifacts and contact history

### 2.2 Recruit Board Item
The recruit board item is the operational container for:
- priority ranking
- tags and notes
- ownership (staff assignment)
- next action and due dates
- risk/warnings (e.g., missing info, low contact frequency)

### 2.3 Evaluation Artifact
Evaluations represent structured assessments of fit and potential.
They may include:
- coach-authored qualitative notes
- measurable performance inputs (results, verified/unverified)
- “coachable” metric inputs (where available)
- fit signals (program needs, event groups, culture alignment)

### 2.4 Contact / Interaction Event
An attributable record of contact attempts and outcomes, including:
- email/text/call/visit events
- visit scheduling
- commitments signals and confirmations

---

## 3. Stored Facts vs Derived Analytics
### 3.1 Must Be Stored (Facts)
- pipeline state transitions and history
- evaluation inputs (as recorded facts: results links, notes, structured ratings)
- contact events and outcomes
- commitment confirmations (with attribution)

### 3.2 Must Be Derived (Analytics)
- Scout Score (bounded; interpretable)
- Commit Probability (forecast with uncertainty)
- Pipeline Projection (cohort gap forecast)

Analytics must store provenance: inputs, version, timestamps, confidence.

---

## 4. Canonical Invariants
1. **Single pipeline truth per program:** a recruit has one controlling pipeline state per program context.
2. **Attribution:** pipeline changes, evaluations, and contacts must be attributable.
3. **Interpretability:** scores are never displayed without rationale and supporting signals.
4. **No silent automation:** AI may recommend state changes; humans confirm.
5. **Boundary discipline:** Recruiting does not own training truth or program health truth.

---

## 5. Boundaries with Adjacent Domains
### 5.1 With Program Health
Recruiting consumes:
- constraint profile
- stability risks
- absence anomalies (as context)
Recruiting does not write Program Health indicators.

### 5.2 With Roster & Scholarship
Roster-building consumes:
- pipeline states
- evaluation summaries
- forecast outputs
Recruiting does not allocate scholarships (it may suggest resource prioritization only).

### 5.3 With Performance
Recruiting may ingest performance history as input (results), but does not interpret training readiness.
Performance outcomes may feed back into recruiting learning as read-only signals.

---

## 6. Lifecycle States
Recruiting pipeline states are defined as canonical in `02_architecture/state_transitions.md`.
This domain defines the semantics of those states and the required artifacts at each stage.

---

## 7. References
- `02_architecture/state_transitions.md`
- `02_architecture/data_flow.md`
- `02_architecture/event_causality.md`
- `05_ai_systems/*`
