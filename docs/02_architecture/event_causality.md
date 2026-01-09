# Event Causality
**Authority Level:** Architecture Law (binding)  
**Purpose:** Define how system signals flow across modules without violating ownership.

---

## 1. Principle: Upstream Signals, Downstream Decisions
Upstream modules emit *signals*. Downstream modules make *decisions* using those signals plus their own local truth.

Signals must be:
- attributable
- explainable
- time-bounded (timestamped)
- non-destructive (they do not overwrite downstream truth)

---

## 2. Canonical Causal Flow
### 2.1 Program Health → Recruiting
Program Health emits:
- constraint profile (staffing, facilities, travel, academics)
- stability risks (attrition risk, attendance patterns, absence anomalies)
- philosophy drift cues (contextual overlay)

Recruiting consumes these as:
- evaluation context
- prioritization/triage signals
- warnings about pipeline fragility

### 2.2 Recruiting → Roster-building
Recruiting emits:
- pipeline state transitions
- evaluation summaries (scout score inputs/outputs, fit notes)
- commit probability forecasts
- pipeline projection (cohort gap forecasts)

Roster-building consumes these as:
- roster target planning
- scholarship allocation strategy
- attrition mitigation planning

### 2.3 Roster-building → Performance
Roster-building emits:
- roster composition decisions
- scholarship constraints (equivalency/dollars)
- athlete role expectations (development targets)

Performance consumes these as:
- training group design
- seasonal planning constraints
- athlete development tracks

### 2.4 Performance → Meet Management
Performance emits:
- availability/readiness states
- event assignment candidates
- training/meet schedule constraints

Meet Management consumes these as:
- entry decisions
- seeding strategies
- operational checklists

---

## 3. System Event Taxonomy (Recommended)
Events are logical records; they are not necessarily “realtime pub/sub.” Use the model that fits implementation.

### 3.1 State Transition Events
Examples:
- `recruit.pipeline_state_changed`
- `roster.decision_finalized`
- `season.mode_changed`
- `athlete.availability_changed`

### 3.2 Signal Emission Events
Examples:
- `program_health.constraint_profile_updated`
- `absence_engine.anomaly_detected`
- `commit_probability.updated`
- `pipeline_projection.updated`

### 3.3 Audit / Governance Events
Examples:
- `philosophy.version_published`
- `permissions.changed`
- `billing.entitlement_changed`

---

## 4. Causality Transparency Requirement
Whenever an event influences a downstream recommendation, the system must be able to show:
- the upstream signal
- timestamp and source
- the interpretation applied
- the downstream decision surface affected

This is required for coach trust and governance.

---

## 5. Feedback Loops (Allowed, Bounded)
Feedback loops are allowed when they do not violate ownership:
- performance outcomes may inform recruiting analytics (read-only ingestion)
- recruiting conversions may inform program health stability analysis (signals only)

Feedback must be explicit and documented to avoid hidden coupling.

---

## 6. Failure Mode Guardrails
- If upstream signal is missing, downstream must degrade gracefully (no fabricated certainty).
- If signals conflict, surface the conflict rather than silently choosing.
- Always preserve original source attribution.
