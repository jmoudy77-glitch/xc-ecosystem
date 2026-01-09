# Program Health (Operational Module)
**Authority Level:** Operational Module (binding)  
**Scope:** Coach-facing workflows for structural diagnosis and continuity risk posture  
**Dependencies:** `01_governance/*`, `02_architecture/*`, `03_domain_models/program_health_domain.md`  
**Boundary:** Upstream of Recruiting; may overlay Performance surfaces without contaminating truth

---

## 1. What this module is for
Program Health is the system’s **structural diagnosis engine** for a program.
It exists to answer questions a coach normally feels but cannot measure cleanly:

- Is the program stable or brittle right now?
- What risks threaten continuity (attendance patterns, staffing, culture drift, constraints)?
- What constraints are real and should govern decisions downstream?
- Where is the program drifting away from its own philosophy—and why?

This module produces upstream signals that protect recruiting strategy and season execution.

---

## 2. Coach outcomes (what a coach should be able to do)
A coach should be able to:
- See an honest, explainable health posture (Stable / Watch / At Risk / Critical)
- Understand *why* that posture exists (indicator breakdown)
- Detect emerging issues early (trends, anomalies)
- Declare and maintain constraint profiles (staffing/facilities/academics/travel)
- Preserve institutional memory of structural changes and interventions
- Hand Program Health understanding to future staff without knowledge loss

---

## 3. Primary workflows (minimal-touch)
### 3.1 Program Health Dashboard (Executive clarity)
**Goal:** One-screen view of program posture.
- Health status with indicator cards (explainable)
- Trend direction and “what changed since last week”
- Top 3 risks (each with provenance)
- Constraint profile snapshot

**Interaction rules**
- No dense charts by default; coach can drill down.
- Every risk card must include “why” and “what to do next.”

### 3.2 Constraint Profile Management (Reality declaration)
**Goal:** Coach declares constraints once; system reuses everywhere.
- Staffing capacity
- Facility access windows
- Travel constraints
- Academic calendar constraints
- Program-specific constraints (custom)

**Interaction rules**
- Simple “edit in place” with clear effective dates.
- Changes treated as high-impact (see Governance decision protocol).

### 3.3 Absence/Engagement Monitoring (A1 / anomaly signals)
**Goal:** Detect attendance anomalies and patterns that matter.
- Absence Engine flags anomalies
- Coach can label reasons/categories (improves interpretability)
- Coach can suppress/dismiss signals with rationale

**Interaction rules**
- Never nag; show signal strength + what it is based on.
- Dismiss is reversible and recorded.

### 3.4 Structural Intervention Notes (Institutional memory)
**Goal:** Preserve “what we changed and why.”
- coaching/staffing changes
- policy changes (attendance rules, culture interventions)
- facility changes
- scheduling interventions

**Interaction rules**
- Quick-add notes; optional attachment to a risk/indicator.
- Searchable later.

---

## 4. Data & integration points
- Consumes facts from Performance and Meet domains (attendance outcomes, availability, results) as inputs.
- Emits signals to Recruiting/Roster/Performance as context (constraint profile, stability risk, anomalies).
- Stores derived indicators as auditable analytics (inputs + version + timestamp).

---

## 5. Outputs (what other modules can rely on)
- Constraint Profile (authoritative declaration + derived signals)
- Health Indicators (explainable, time-bounded)
- Risk Posture classification (derived)
- Absence Engine anomaly signals (derived, provenanced)
- Philosophy drift cues (overlay only, never contaminating truth)

---

## 6. Non-negotiables
- Must remain upstream of Recruiting (`02_architecture/module_boundaries.md`).
- Must not rewrite performance or attendance facts.
- Must preserve causality transparency (why / what happens if / reversible).
- Must degrade gracefully when data is missing (Unknown rather than false certainty).
