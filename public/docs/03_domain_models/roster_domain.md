# Roster & Scholarship Domain Model
**Authority Level:** Domain Model (binding)  
**Purpose:** Canonical meaning for roster composition, scholarship budgets, equivalencies/dollars, and audit history.

---

## 1. Definition
The **Roster** domain converts recruiting and institutional constraints into:
- a season roster composition
- roles and expectations
- scholarship allocations (where applicable)
- continuity and attrition mitigation plans

Roster-building is downstream of Recruiting and upstream of Performance.

---

## 2. Core Entities (Canonical)
### 2.1 Roster (Season-Scoped)
A roster is a season-scoped set of athletes with membership attributes:
- status (active/inactive/transfer/alumni)
- team assignment(s)
- role category (as configured by program)
- scholarship participation link (if applicable)

### 2.2 Scholarship Budget
A program/team/season scholarship budget may be represented as:
- **equivalency-based** (common for NCAA)
- **dollar-based** (common for HS/program-defined)
- hybrid (program-defined, explicit)

Budgets must support:
- allocated amount
- remaining amount
- constraints (min/max by athlete, by class, by event group)
- audit history

### 2.3 Scholarship Allocation (Athlete-Scoped)
An allocation is the authoritative record of support provided to an athlete, including:
- amount (equivalency or dollars)
- effective dates / season scope
- rationale (optional but recommended)
- attribution and audit

### 2.4 Audit / History Record
Roster and scholarship changes must be traceable over time:
- who changed what, when, and why (where high-impact)
- prior value → new value

---

## 3. Stored Facts vs Derived Analytics
### 3.1 Must Be Stored (Facts)
- roster membership and membership changes
- scholarship budgets and allocations
- offer/commitment actions that alter roster composition
- constraints and exceptions applied

### 3.2 Must Be Derived (Analytics)
- roster risk posture (attrition risk signals)
- pipeline-to-roster projections
- “what-if” scenario outputs (must be marked non-authoritative until finalized)

---

## 4. Canonical Invariants
1. **Single roster truth per season/team:** roster membership is authoritative and must not be duplicated in shadows.
2. **Conservation of scholarship budget:** allocations may not exceed configured budget unless explicit override is recorded.
3. **Auditability:** all changes must be attributable; high-impact changes should capture rationale.
4. **Boundaries:** roster owns allocations; recruiting does not allocate; performance does not allocate.
5. **Scenario separation:** simulations must not overwrite authoritative allocations until confirmed.

---

## 5. Boundaries with Adjacent Domains
### 5.1 With Recruiting
Roster consumes recruiting evaluations and pipeline forecasts.
Roster emits roster decisions and scholarship constraints back to recruiting as context (read-only).

### 5.2 With Performance
Performance consumes roster composition and constraints to:
- build training groups
- define development tracks
Roster does not define daily training truth.

### 5.3 With Program Health
Program Health may consume roster stability signals (attrition patterns).
Roster does not write health indicators.

---

## 6. References
- `02_architecture/data_flow.md`
- `02_architecture/event_causality.md`
- `05_ai_systems/pipeline_projection.md`
