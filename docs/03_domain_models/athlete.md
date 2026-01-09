# Athlete Domain Model
**Authority Level:** Domain Model (binding)  
**Precedence:** Subordinate to Governance + Architecture; controlling over Operational Modules, AI, UI, Implementation  
**Purpose:** Define canonical meaning for “Athlete” across XC-Ecosystem, including identity vs program-specific truth and lifecycle semantics.

---

## 1. Definition
An **Athlete** is a person who may be:
- a current rostered participant in a program
- a prospective recruit within a program’s pipeline
- a historical participant retained in institutional memory
- an athlete operating in athlete-facing flows (where enabled)

The Athlete entity must support continuity across seasons and roles (prospect → recruit → rostered → alumni/transfer).

---

## 2. Core Sub-Entities (Canonical)
### 2.1 Athlete Identity (Shared Infrastructure Truth)
Represents stable identity and eligibility basics.
Typical fields:
- legal name / preferred name
- date of birth (if stored) and eligibility year/class year (as configured)
- contact methods (email/phone) with consent controls
- external identifiers (optional) (e.g., federation IDs, result-system IDs)

**Rules**
- Identity truth is governed by strict permissions.
- Modules may reference identity, but must not “rewrite” identity as a side effect of module workflows.

### 2.2 Athlete–Program Membership (Program-Specific Truth)
Represents the athlete’s relationship to a specific program (and potentially team within program).
Examples:
- membership status (active/inactive/transfer/alumni)
- team assignment(s) and event group(s)
- scholarship participation (where applicable)
- coaching notes and development records (owned by module boundaries)

### 2.3 Athlete History (Institutional Memory)
Represents durable longitudinal records (performance history, attendance patterns, development notes, recruiting history).
This is preserved for continuity and analysis.

---

## 3. Stored Facts vs Derived Analytics
### 3.1 Stored Facts (Must Be Stored)
- attendance outcomes (present/absent + reason category where available)
- availability state (available/limited/unavailable/unknown) and effective ranges
- results (times/marks/placements) and verification status
- roster membership states and scholarship allocations
- recruiting pipeline states and contact events
- coach notes that are treated as factual observations (attribution required)

### 3.2 Derived Analytics (Must Be Derived, Versioned)
- scout score, commit probability, projections
- readiness classifications
- program health classifications related to athlete patterns
- risk flags (injury risk signals, anomaly detection outputs)

**Rule:** analytics never overwrite facts; they interpret them.

---

## 4. Lifecycle States (Cross-Domain)
Athlete-related states are represented in adjacent domain models (Recruiting pipeline, Performance availability, Roster membership).

Canonical lifecycle transitions (conceptual):
1) Prospect discovered → 2) Recruit pipeline evaluation → 3) Commitment/roster onboarding → 4) Active season execution → 5) Alumni/transfer/history

These transitions must preserve historical records and attribution.

---

## 5. Athlete Attributes (Canonical Categories)
### 5.1 Athletic Profile
- primary events/disciplines (XC / track event groups)
- performance history (results timeline)
- training history (where stored as fact)
- injury/availability history (fact + derived signals)

### 5.2 Academic & Compliance (Program-Configured)
- eligibility signals (stored per program configuration)
- academic accolades (awards, honors, GPA bracket if allowed)
- compliance constraints (permissions and access boundaries)

### 5.3 Accolades (Required Storage Support)
The platform must support storage of:
- athletic accolades (titles, awards, PR milestones, records)
- academic accolades (honor roll, academic awards, test scores where permitted)
All accolades must be attributable and scoped to season/time range.

### 5.4 Coachable Metric (Coach-Assigned)
A “coachable” metric may be assigned by the high school coach (or program coach depending on context).
**Rule:** it is a coach-authored field; AI may recommend but cannot assign without explicit coach action.

---

## 6. Boundary Rules
- Recruiting may own evaluation and pipeline-specific fields for an athlete-as-recruit.
- Performance owns training plan participation and readiness/availability states.
- Roster/Scholarship owns scholarship allocations and roster composition decisions.
- Program Health may compute risk signals based on athlete patterns but does not own performance truth.

---

## 7. Minimal Requirements for Any Athlete Surface
Any UI or workflow that acts on an Athlete must be able to show:
- current membership/pipeline context
- current availability state (or “Unknown”)
- provenance for key analytics (what it’s based on)
- role-based visibility constraints

---

## 8. References
- `02_architecture/data_authority.md`
- `02_architecture/state_transitions.md`
- `03_domain_models/recruiting_domain.md`
- `03_domain_models/performance_domain.md`
- `03_domain_models/roster_domain.md`
