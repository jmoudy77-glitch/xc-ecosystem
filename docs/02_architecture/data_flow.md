# Data Flow
**Authority Level:** Architecture Law (binding)  
**Precedence:** Subordinate to Governance; controlling over Domain Models, Modules, AI, UI, Implementation  
**Purpose:** Define how data is created, stored, derived, audited, and consumed across the XC‑Ecosystem.

---

## 1. Architecture Thesis
The XC‑Ecosystem distinguishes between:

- **Stored facts**: authoritative records of reality (events, states, measurements, decisions)
- **Derived analytics**: computed interpretations of facts (scores, probabilities, projections, classifications)

This separation is mandatory. It preserves truth, auditability, and coach trust.

---

## 2. Core Definitions

### 2.1 Stored Facts
Stored facts are records that answer: **“What happened?”** and **“What is true right now?”**

Examples:
- athlete performances (times, marks, results imports)
- attendance outcomes (present/absent; reason where applicable)
- availability state (available/limited/unavailable/unknown)
- recruiting pipeline state changes
- roster decisions and scholarship allocations
- season mode changes

**Rules**
- Stored facts must have attribution (actor/system), timestamp, and scope (tenant/program/team/season).
- Stored facts must be durable and auditable.
- Stored facts must not be overwritten by analytics outputs.

### 2.2 Derived Analytics
Derived analytics are computed outputs that answer: **“What does this mean?”** and **“What is likely next?”**

Examples:
- Scout Score
- Commit Probability
- Pipeline Projection
- Program Health classifications
- Absence Engine anomaly signals

**Rules**
- Derived analytics must be versioned (model/version), timestamped, and attributable.
- Derived analytics must be reproducible (or explainably non‑reproducible) based on recorded inputs.
- Derived analytics must never be treated as authoritative truth without explanation context.

---

## 3. Canonical Data Lifecycle

### 3.1 Creation (Ingestion / User Entry)
Data enters the system through:
1) **User-authored inputs** (coach/staff/athlete forms, notes, decisions)  
2) **Operational entries** (meet manager entries, schedules, lineups)  
3) **Ingestion** (results imports, optional external datasets)  
4) **System events** (state transitions, audit logs)

All writes must occur through **module-owned server actions** (or narrowly scoped API routes for integrations/webhooks).

### 3.2 Storage (Authoritative Persistence)
Each module owns its authoritative tables (see `data_authority.md`). Storage must be:
- tenant-scoped (RLS + server action guards)
- attribution-complete (who/when/why for high-impact)
- normalized enough to avoid duplication of truth

### 3.3 Derivation (Analytics / AI)
Derivation occurs only after facts exist.
Derived outputs must store:
- **inputs** (explicit references, not “implied”)
- **assumptions** (e.g., cohort window, season mode, missing-data handling)
- **model/version** (or ruleset version)
- **timestamp** and **scope**
- **confidence/uncertainty semantics** where applicable

### 3.4 Consumption (UI / Downstream Modules)
Consumption must preserve meaning:
- UI may display facts and analytics, but must label them correctly.
- Downstream modules consume signals via contracts, not ad-hoc coupling.
- Any downstream decision surface influenced by an upstream signal must be able to show provenance (source + timestamp).

---

## 4. AI Output Storage Requirements (Platform-Wide)
All AI outputs are treated as **derived analytics** and must be auditable.

### 4.1 Mandatory Fields (Canonical)
Each AI output record must include:
- `tenant_id` / `program_id` (and `team_id`/`season_id` where relevant)
- `produced_at`
- `model_name` and `model_version` (or ruleset version)
- `inputs` (references or snapshot IDs)
- `output` (score/probability/projection)
- `confidence` (or uncertainty representation)
- `explanation` (human-readable rationale)
- `status` (active/superseded/invalidated)
- `attribution` (system actor, job id)

### 4.2 Supersession Rule
Derived outputs may be superseded by newer runs, but must not be deleted without governance.
Store as:
- active record + superseded records (append-only where feasible)

---

## 5. Derivation Boundaries (Compute vs Product Truth)
Derived analytics may influence prioritization, but must not rewrite facts.

Examples:
- Program Health “At Risk” does not change the stored attendance facts; it classifies them.
- Commit Probability does not change a recruit’s pipeline state; it informs a coach’s next action.
- Absence Engine flags anomalies; it does not rewrite attendance outcomes.

---

## 6. Tenant Scoping and Security
All data access must be:
- **tenant-scoped** (RLS enforcing org/program boundaries)
- **role-scoped** (coach vs staff vs athlete permissions)
- **path-scoped** (server actions must validate program/team ownership)

Rule: If a query can leak cross-tenant data, the implementation is invalid until fixed.

---

## 7. Data Movement Patterns (Allowed)
### 7.1 Read-Only Projections
Allowed for performance or UI needs, with strict rules:
- include source attribution
- derivable from source truth
- not editable by downstream modules

### 7.2 Events / State Transitions
Allowed as logical records to drive downstream workflows:
- state transitions must be attributable
- downstream must preserve provenance
- conflicts must surface rather than silently choosing

### 7.3 Materialized Summaries
Allowed where required for performance:
- owned by the source module
- recomputable
- updated via explicit job or trigger

---

## 8. Failure Modes and Required Behavior
- Missing data must degrade gracefully (no fabricated certainty).
- Conflicting signals must surface as conflict with provenance.
- UI must show “Unknown” states where truth is incomplete.
- AI must not infer irreversible conclusions from incomplete inputs without warning.

---

## 9. References
- `02_architecture/data_authority.md`
- `02_architecture/event_causality.md`
- `02_architecture/state_transitions.md`
- `05_ai_systems/*` (AI I/O charters)
- `07_implementation/*` (storage/access patterns)
