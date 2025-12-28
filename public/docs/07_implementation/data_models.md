# Data Models (Implementation View)
**Authority Level:** Implementation Law (binding)  
**Purpose:** Provide practical modeling rules aligned to Domain Models and Architecture Law.

---

## 1. The Rule of Meaning
Domain Models define what entities *mean*.
Implementation models must encode that meaning without creating shadow truth.

If the DB schema cannot represent the domain meaning cleanly, adjust schema or domain model—do not hack around it.

---

## 2. Stored Facts vs Derived Analytics (Implementation Separation)
### 2.1 Facts tables
Facts should be stored as durable records with attribution and timestamps.
Examples:
- attendance outcomes
- availability states
- results
- pipeline state transitions
- scholarship allocations
- meet entries and results imports

### 2.2 Analytics tables
Derived outputs are stored separately, and must include:
- model/ruleset version
- produced timestamp
- input references/snapshots
- confidence semantics
- explanation/rationale

This is required for auditability and coach trust.

---

## 3. Tenancy and Scope Modeling
### 3.1 Preferred approach
- Every row includes the relevant scope key(s): program/team/season
- RLS policies use these keys to enforce isolation
- Server actions validate that path scope matches row scope

### 3.2 Membership mapping
Maintain explicit membership tables to connect users to programs/teams and roles.
RLS should be grounded in membership, not ad-hoc assumptions.

---

## 4. Auditability Modeling
High-impact tables should include:
- `created_by`, `updated_by`
- timestamps
- optional: `change_reason` for high-impact decisions
- optional: audit log tables with before/after

Scholarship allocations, pipeline state transitions, and entitlement changes should always be auditable.

---

## 5. State Modeling
State machines must be explicit and finite.
Prefer:
- a `state` column plus a `state_history` table (or event log)
- include attribution for transitions

State labels must match canonical definitions in `02_architecture/state_transitions.md`.

---

## 6. Constraints and Integrity
Use database constraints where feasible:
- foreign keys to enforce relationships
- check constraints for enumerated values
- unique indexes for identity uniqueness within scope
- guardrails preventing invalid budget states (where applicable)

---

## 7. Versioning and Evolution
- Additive schema changes are preferred.
- When changing meaning, create new fields/tables and deprecate old with migration.
- Maintain `schema.md` references and update docs with every migration.

---

## 8. Practical Core Entity Set (High-level)
Core system entities (not exhaustive):
- identity/auth: users, roles, memberships
- program/teams/seasons
- athletes + athlete_program_membership
- recruiting: recruit_board_items, evaluations, contact_events, pipeline_history
- roster/scholarship: roster_membership, scholarship_budgets, scholarship_allocations, audit logs
- performance: training_plans, practices, assignments, attendance_outcomes, availability_states
- meets: meets, entries, seeding_artifacts, results_imports
- billing: subscriptions, entitlements, stripe_events
- analytics: ai_outputs (scoped), health_indicators

The exact schema is governed by `/docs/schema/*` and should stay aligned with these meaning rules.

---

## 9. References
- `03_domain_models/*`
- `02_architecture/data_authority.md`
- `02_architecture/data_flow.md`
- `05_ai_systems/ai_output_record_contract.md`
