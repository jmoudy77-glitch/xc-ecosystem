# Performance Domain Model
**Authority Level:** Domain Model (binding)  
**Purpose:** Canonical meaning for training load, performance metrics, season execution, and actionable clarity outputs.

---

## 1. Definition
**Performance** is the domain that governs in-season execution and athlete development:
- training plans and practice design
- readiness and availability states
- workload and adaptation signals
- event assignments (as performance decisions)
- actionable clarity outputs that help coaches decide what to do next

Performance is downstream of roster composition and receives Program Health overlays as context.

---

## 2. Core Entities (Canonical)
### 2.1 Training Plan (Season-Scoped)
A structured plan containing:
- microcycles (week-level structure)
- practices (session-level structure)
- workouts/events assigned to groups/individuals
- constraints (facility/time/weather considerations as inputs where enabled)

### 2.2 Practice Session
A time-bounded session containing:
- planned components (warmup, main set, cooldown, strength, etc.)
- assignments to groups/athletes
- completion outcomes (what happened vs planned, where recorded)

### 2.3 Workload Fact vs Workload Interpretation
Workload must distinguish:
- **facts**: completed session data (distance, duration, RPE if recorded)
- **interpretations**: load scores, fatigue indices, readiness classifications

Interpretations are derived analytics and must be versioned/provenanced.

### 2.4 Readiness State
A derived classification representing preparedness to train/compete.
Readiness must be explainable and should incorporate:
- recent workload facts
- availability state and constraints
- recent results and recovery windows (where available)

### 2.5 Availability (Authoritative State)
Availability states are canonical and must be stored as facts (available/limited/unavailable/unknown).

### 2.6 Coach Notes & Development Records
Coach-authored notes are attributable facts that may influence decisions and provide continuity.

### 2.7 “Actionable Clarity” Outputs
The system must support coach decision-making by producing outputs that answer:
- What should I do today?
- What risk am I carrying?
- Who needs attention?
- What happens if I adjust workload?

These are summaries built from facts + derived analytics, never replacing them.

---

## 3. Stored Facts vs Derived Analytics
### 3.1 Must Be Stored (Facts)
- training plan artifacts (plan structure and assignments)
- attendance outcomes and completion records where captured
- availability states (with effective ranges and reasons)
- results and verification statuses
- coachable metric values (coach-authored)
- coach notes (attribution required)

### 3.2 Must Be Derived (Analytics)
- readiness classifications
- workload indices, fatigue scores, trend flags
- predicted outcomes / scenario projections (marked non-authoritative)
- pattern detections (injury risk signals) with uncertainty

---

## 4. Canonical Invariants
1. **Truth separation:** facts are not overwritten by interpretations.
2. **Explainability:** readiness and risk outputs must show contributing factors.
3. **Boundaries:** performance does not allocate scholarships and does not define recruiting evaluation truth.
4. **Graceful degradation:** if data is missing, show “Unknown” rather than false precision.
5. **Reversibility:** training changes must indicate downstream effects and reversibility where applicable.

---

## 5. Boundaries with Adjacent Domains
- Roster provides composition and constraints; Performance uses them to structure training groups.
- Program Health provides overlays (risk posture, constraints); Performance may display them without rewriting metrics.
- Meet Management consumes availability/readiness for operational entries; results flow back as facts.

---

## 6. References
- `02_architecture/state_transitions.md`
- `02_architecture/data_flow.md`
- `04_operational_modules/performance.md`
- `06_ui_system/*`
