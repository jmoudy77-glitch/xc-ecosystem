# Module Boundaries
**Authority Level:** Architecture Law (binding)  
**Precedence:** Subordinate to Governance; controlling over Domain Models, Modules, AI, UI, Implementation  
**Purpose:** Define clear ownership and boundaries so the platform remains scalable, auditable, and non-fragile.

---

## 1. Architecture Thesis
The XC‑Ecosystem is a modular institutional system. The core protection against drift is **clean ownership**:
- each module owns its data, semantics, and decision surfaces
- downstream modules consume upstream signals, not raw, uncontrolled state
- cross-module logic is expressed via explicit contracts (events, computed views, or server actions)

This document defines what can depend on what, and what cannot.

---

## 2. Canonical Modules (Coach-Facing)
### 2.1 Program Health (Upstream)
**Purpose:** Measure stability, risk posture, culture/continuity signals, and systemic readiness.  
**Primary outputs:** health indicators, alerts, risks, stability scorecards, constraint profiles.  
**Downstream consumers:** Recruiting, Performance, Roster-building, Season planning.

### 2.2 Recruiting (Downstream of Program Health)
**Purpose:** Build and manage pipeline, evaluate athletes, quantify fit, and structure contact workflows.  
**Primary outputs:** recruit board, evaluations, scout score, commit probability, pipeline forecasts.  
**Downstream consumers:** Roster-building, Scholarship budgeting, Season planning.

### 2.3 Roster-building (Downstream of Recruiting)
**Purpose:** Convert pipeline into roster composition across seasons and teams with constraints.  
**Primary outputs:** roster decisions, scholarship allocations, targets, attrition mitigation.  
**Downstream consumers:** Performance planning, Meet management.

### 2.4 Performance (In-season decision headquarters)
**Purpose:** Training design, athlete development, season-cycle execution, and performance readiness.  
**Primary outputs:** training plans, readiness states, workload signals, event assignments, performance analytics.  
**Receives:** roster context + health overlays; does not rewrite truth metrics.

### 2.5 Meet Management
**Purpose:** Operational execution of meets and season schedules (entries, seeding, logistics).  
**Primary outputs:** meet calendars, lineups, checklists, race execution artifacts.  
**Receives:** athlete availability, readiness signals; remains operationally bounded.

---

## 3. AI Systems Are Subsystems, Not Modules
AI systems are **bounded decision-support engines** that attach to modules but do not own reality.
- Scout Score, Commit Probability, Pipeline Projection attach to Recruiting/Roster contexts.
- Absence Engine attaches to Program Health (and optionally overlays Performance surfaces).
- AI may not create new authority; it operates under Governance charter.

---

## 4. Dependency Graph (Allowed Direction of Influence)
Allowed dependency direction (upstream → downstream):

**Program Health → Recruiting → Roster-building → Performance → Meet Management**

Additional overlays:
- Philosophy Alignment overlays may appear in Program Health, Recruiting, Performance, but must not contaminate underlying measurement truth.
- UI System Law applies across all modules.
- Implementation Law enforces the contracts, never replaces them.

### 4.1 Prohibited Dependencies
- Performance must not redefine recruiting evaluation semantics.
- Recruiting must not alter Program Health indicators.
- Meet Management must not create “shadow truth” about athlete readiness that diverges from Performance readiness truth.
- Any module may not mutate data owned by another module outside explicit contracts.

---

## 5. Cross-Cutting System Services (Allowed Shared Layers)
Shared layers are permitted when they are **infrastructure** not **domain authority**:

- **Identity & Access** (org/program/user/role permissions; enforced via RLS + server actions)
- **Billing & Entitlements** (Stripe; feature gating; plan enforcement)
- **Branding & Theme** (school identity; UI tokens)
- **Notifications** (email/in-app alerts; module-owned triggers)
- **Audit Logging** (immutable attribution + change history)
- **Document/Media Storage** (athlete media; program docs; governed access)

Shared services may not become “domain brains.” Domain brains live in modules.

---

## 6. Data Ownership at a Glance
Each module owns its core tables and computed entities (details in `data_authority.md`):

- Program Health: health indicators, absence signals, readiness constraints, stability notes
- Recruiting: recruit board items, contacts, evaluations, scout score inputs/outputs
- Roster-building: roster decisions, scholarship allocations, pipeline-to-roster mapping
- Performance: training plans, workouts, readiness states, attendance outcomes (as performance inputs), coachable metric
- Meet: meet calendar items, entries, seeding outputs, checklists

---

## 7. Integration Contracts (How Modules Talk)
Modules communicate through explicit mechanisms only:
1. **Server Actions / API Routes** that enforce ownership and permissions  
2. **Events** (logical events recorded and consumed)  
3. **Computed Views / Materialized summaries** (owned by source module)  
4. **Read-only projections** (downstream copies derived from source truth)

No ad-hoc database joins in UI should substitute for module contracts.

---

## 8. Practical Engineering Guardrails
- Centralize data logic in reusable server actions (avoid inline queries).
- Enforce ownership through naming, directories, and access patterns.
- Favor stable contracts over convenience joins.
- If a module needs new data from another, extend the contract rather than coupling directly.

---

## 9. Amendment Rule
Any change to module boundaries requires:
- updating this document
- updating `data_authority.md`
- updating affected module docs
- confirming AI jurisdiction remains bounded
