# State Transitions
**Authority Level:** Architecture Law (binding)  
**Purpose:** Define the canonical lifecycle states the system uses so modules and UI remain consistent.

---

## 1. Why States Matter
States are a shared contract. They prevent:
- ambiguous UI
- inconsistent AI interpretations
- fragile module coupling
- “same word, different meaning” errors

States must be explicit, finite, and auditable.

---

## 2. Recruiting Pipeline States (Canonical)
A recruit exists in a pipeline with clear transitions.

### 2.1 States
1. **Prospect** — discovered; minimal info  
2. **Identified** — known target; initial evaluation started  
3. **Engaged** — active contact and mutual interest  
4. **Active Visit / Deep Evaluation** — high-touch evaluation stage  
5. **Priority** — strongly desired; resources/time allocated  
6. **Verbal / Soft Commit** — intent signaled, not finalized  
7. **Committed** — commitment confirmed (program-defined)  
8. **Signed / Official** — official paperwork complete (where applicable)  
9. **Closed – Lost** — no longer attainable  
10. **Closed – Not Fit** — intentionally dropped due to fit/constraints

### 2.2 Transition Rules
- Transitions must be attributable (who changed it, why).
- AI may recommend transitions but may not execute without coach/staff action (per Governance).
- A recruit may move backward (e.g., Priority → Engaged) if reality changes; preserve history.

---

## 3. Athlete Availability States (Canonical)
Availability is a Performance-owned state used by multiple modules.

1. **Available**  
2. **Limited** (can train/compete with constraints)  
3. **Unavailable** (cannot train/compete)  
4. **Unknown** (insufficient info; triggers follow-up workflows)

Availability must include:
- effective date range
- reason category (injury/illness/academic/travel/personal)
- confidence (if inferred)
- notes (coach/staff)

---

## 4. Season Mode States (Canonical)
Season mode affects prioritization and UI emphasis.

1. **Off-Season / Base**  
2. **Build**  
3. **In-Season**  
4. **Championship Phase**  
5. **Transition / Recovery**

Season mode changes are high-impact decisions (see Governance decision protocol).

---

## 5. Program Health Status States (Canonical)
Program Health represents a program’s posture as signals, not moral judgments.

1. **Stable** — no elevated systemic risks  
2. **Watch** — emerging risks; monitor  
3. **At Risk** — elevated risk; intervention recommended  
4. **Critical** — significant threats to continuity/performance; immediate attention  

These are computed classifications and must remain explainable.

---

## 6. UI Consistency Rule
Any surface that displays these states must:
- use the same labels and definitions
- provide tooltips or definitions where needed
- show what actions are available and reversible

---

## 7. Deprecation Rule
States may only be changed by:
- updating this document
- migrating stored state values
- updating downstream module docs and UI law
