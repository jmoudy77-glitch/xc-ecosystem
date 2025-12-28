# Program Health Domain Model
**Authority Level:** Domain Model (binding)  
**Purpose:** Canonical meaning for structural diagnosis, continuity risk, and root-cause signals (including Absence Engine A1).

---

## 1. Definition
**Program Health** is the domain that measures the program’s systemic posture:
- stability and continuity
- operational capacity and constraints
- culture and attendance/engagement patterns (as measured signals)
- root-cause hypotheses and risks

Program Health is upstream of Recruiting and supports Performance as an overlay (context), without contaminating measurement truth.

---

## 2. Core Entities (Canonical)
### 2.1 Health Indicator
A structured signal representing an aspect of program posture.
Examples:
- attendance stability signal
- staffing capacity signal
- roster continuity signal
- constraint profile (facilities/travel/academics)

Indicators must be:
- explainable
- attributable (system or coach)
- time-bounded (effective range / produced_at)

### 2.2 Risk Classification
A classification such as Stable/Watch/At Risk/Critical (see Architecture states).
Risk classifications are derived analytics based on indicators, not facts.

### 2.3 Constraint Profile
A compact representation of reality that affects downstream decisions:
- staffing constraints
- facility access constraints
- travel/competition constraints
- academic calendar constraints
Constraint profiles are consumed by Recruiting/Roster/Performance as context.

### 2.4 Absence Engine Signals (A1)
Absence Engine produces anomaly and pattern signals regarding attendance/availability behavior.
It operates on facts (attendance outcomes) and outputs derived analytics with provenance.

---

## 3. Stored Facts vs Derived Analytics
### 3.1 Must Be Stored (Facts)
Program Health does not “own” most raw facts; it consumes them.
However it may store:
- coach-authored structural notes (e.g., staffing changes, facility constraints) with attribution
- formalized constraint declarations (as configured by program)

### 3.2 Must Be Derived (Analytics)
- health indicators computed from facts
- risk classifications
- anomaly signals (Absence Engine outputs)
- root-cause hypotheses (must be labeled as hypotheses, not truth)

---

## 4. Canonical Invariants
1. **No contamination rule:** health classifications do not rewrite attendance truth or performance truth.
2. **Explainability:** any risk level must be traceable to indicators and facts.
3. **Provenance:** AI signals must store inputs, version, and timestamps.
4. **Upstream signal discipline:** Program Health emits signals; it does not compel downstream decisions.
5. **Respect philosophy overlays:** philosophy alignment may overlay meaning but never changes measurement truth.

---

## 5. Boundaries with Adjacent Domains
- Recruiting consumes constraint profiles and stability risks as context.
- Performance may surface health overlays (risk posture) but performance metrics remain clean.
- Roster may use health signals for continuity planning but remains owner of allocations and membership truth.

---

## 6. References
- `02_architecture/state_transitions.md`
- `02_architecture/data_flow.md`
- `05_ai_systems/absence_engine.md`
