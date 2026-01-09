# Performance (Operational Module)
**Authority Level:** Operational Module (binding)  
**Scope:** In-season execution, actionable clarity, training design, readiness and development oversight  
**Dependencies:** `01_governance/*`, `02_architecture/*`, `03_domain_models/performance_domain.md`  
**Boundary:** In-season headquarters; may show philosophy overlays but must not contaminate performance truth fileciteturn2file1L13-L13

---

## 1. What this module is for
Performance is where coaches live during the season.
It exists to replace daily chaos with governed execution:
- training plans and practice workflows
- readiness and availability states
- workload facts and interpretable interpretations
- actionable clarity: what to do today, who needs attention, what risk is being carried

Performance is downstream of roster reality and upstream of meet operations.

---

## 2. Coach outcomes
A coach should be able to:
- Plan and run practices with minimal friction
- Understand readiness at a glance without losing nuance
- Make workload tradeoffs with clear consequence visibility
- Maintain longitudinal development records that survive staff turnover
- Integrate meet outcomes into training adjustments cleanly

---

## 3. Primary workflows (minimal-touch)
### 3.1 Performance Home (Actionable Clarity)
A single surface that answers:
- What needs attention today?
- Who is at risk (and why)?
- What decisions are pending?
- What changed since last time?

### 3.2 Readiness & Availability Management
- Availability states (facts) with effective windows
- Readiness overlays (derived) with explainability
- “Unknown” states surfaced explicitly

### 3.3 Training Plan & Practice Execution
- Build week-level plan, then drill into sessions
- Group assignments + individual adjustments
- Drag-and-drop events/workouts into practices where feasible
- Record completion outcomes when desired

### 3.4 Athlete Development Records
- Notes, goals, benchmarks
- Coachable metric visibility (coach-authored)
- Trend snapshots (facts + derived)

---

## 4. Data & integration points
- Consumes roster composition and scholarship constraints as context for grouping and expectations.
- Consumes Program Health overlays (constraint profile, stability risk posture) without rewriting truth.
- Emits readiness/availability signals to Meet Management.
- Receives results from Meet Management as facts (results ingestion).

---

## 5. Outputs
- Training plan artifacts and practice sessions
- Availability facts, readiness interpretations
- Actionable clarity summaries (explainable)
- Athlete development records and notes

---

## 6. Non-negotiables
- Must comply with Governance and module boundaries. fileciteturn2file1L12-L12
- Performance truth must not be contaminated by philosophy logic unless explicitly governed. fileciteturn2file1L13-L13
- High-frequency tasks must be minimal-touch; drag-and-drop is preferred where it reduces friction.
- Missing data must degrade to “Unknown,” not false precision.
