# Season Domain Model
**Authority Level:** Domain Model (binding)  
**Purpose:** Define canonical meaning for “Season” as the temporal container for roster composition, training execution, meets, and analysis.

---

## 1. Definition
A **Season** is the program-defined time container that binds together:
- roster composition and scholarship allocations
- training plans and performance cycles
- meet schedules, entries, and results
- recruiting cohort context (for forecasting and projections)
- program health snapshots and risk posture

Seasons are the primary unit of longitudinal comparison (year-over-year learning).

---

## 2. Core Sub-Entities
### 2.1 Season Configuration
- sport (XC or Track & Field)
- start/end dates (or mode windows)
- season mode state (Off-Season/Base/Build/In-Season/Championship/Transition)
- constraint profile (staffing, facilities, travel windows) as signals

### 2.2 Season Cohorts
- rostered athlete cohort
- recruiting cohort(s) feeding the season
- returning vs new athletes (for continuity analysis)

### 2.3 Meet Calendar
Meet schedule and operational artifacts are linked to season.

---

## 3. Stored Facts vs Derived Analytics
Stored facts:
- season mode transitions (high-impact decisions)
- meets, results, attendance outcomes
- roster membership and scholarship allocations for the season

Derived analytics:
- projections and forecasts (pipeline, readiness)
- program health classification trends
- performance summaries

---

## 4. Boundaries
- Performance domain owns the training plan and readiness states within a season.
- Meet domain owns operational meet artifacts and results ingestion.
- Roster domain owns season roster composition and scholarship allocations.
- Program Health may compute season-level risk posture but does not rewrite truth facts.

---

## 5. References
- `02_architecture/state_transitions.md`
- `03_domain_models/roster_domain.md`
- `03_domain_models/performance_domain.md`
