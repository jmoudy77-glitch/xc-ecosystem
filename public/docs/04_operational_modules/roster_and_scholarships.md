# Roster & Scholarships (Operational Module)
**Authority Level:** Operational Module (binding)  
**Scope:** Roster composition, scholarship budgeting, allocations, auditability  
**Dependencies:** `01_governance/*`, `02_architecture/*`, `03_domain_models/roster_domain.md`  
**Boundary:** Consumes Recruiting outputs; upstream of Performance execution

---

## 1. What this module is for
Roster & Scholarships converts recruiting reality into a season roster you can actually build:
- roster composition by team/event group/class year
- scholarship budgets and allocations (equivalency or dollars)
- attrition mitigation planning
- auditable decision history

This module replaces spreadsheets and fragmented budget tracking with an enforceable, explainable system.

---

## 2. Coach outcomes
A coach should be able to:
- See roster composition health (balance, gaps, depth)
- Allocate scholarships confidently without overspending
- Track commitments and offers with audit history
- Run “what-if” scenarios without mutating truth
- Understand downstream impact on performance planning (groups, development tracks)

---

## 3. Primary workflows (minimal-touch)
### 3.1 Roster Builder (composition surface)
- Roster view by team/event group/class year
- Drag-and-drop recruits into roster slots (scenario or committed)
- Highlight gaps and over-concentration

### 3.2 Scholarship Budget Dashboard
- Budget by season/team
- Allocation list with remaining balance
- Guardrails: prevent overspend unless explicit override recorded

### 3.3 Allocation Editor (fast + auditable)
- Quick edit allocations with effective dates
- Mandatory attribution; optional rationale for high-impact edits
- Auto-create audit entries

### 3.4 Scenario Mode (what-if planning)
- Clone roster/budget into scenario
- Compare scenarios side-by-side
- Convert scenario to truth only with explicit confirmation

---

## 4. Data & integration points
- Consumes Recruiting pipeline outputs and forecasts.
- Emits roster composition decisions and constraints to Performance.
- May emit stability signals back to Program Health (read-only feedback).
- Derived scenario outputs must be clearly marked non-authoritative until confirmed.

---

## 5. Outputs
- Authoritative season roster membership
- Scholarship budgets and allocations (auditable)
- Scenario artifacts (non-authoritative until confirmed)
- Roster gap summaries and planning notes

---

## 6. Non-negotiables
- Must remain consistent with budget auditability. fileciteturn2file5L12-L12
- Recruiting does not allocate scholarships; Performance does not allocate scholarships.
- Overspend requires explicit override + audit trail.
- High-frequency roster actions should be drag-first where it reduces friction.
