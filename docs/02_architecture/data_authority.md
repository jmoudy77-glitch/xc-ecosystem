# Data Authority
**Authority Level:** Architecture Law (binding)  
**Purpose:** Define who owns which data, who may write, and how read-only consumption is allowed.

---

## 1. Principle: “Single Writer, Multiple Readers”
For any domain truth, there must be a single authoritative writer.
Downstream modules may read, but do not write unless explicitly delegated via a contract.

This prevents:
- contradictory truth sources
- hidden coupling
- brittle UI joins
- silent drift

---

## 2. Core Entity Ownership
### 2.1 Platform / Org Layer (Shared Infrastructure)
**Owns:** users, organizations/programs, teams, subscriptions, entitlements, audit logs.  
**Writes by:** platform admin services + authorized server actions.  
**Reads by:** all modules (read-only).

### 2.2 Athlete Entity (Domain Meaning)
Athlete is a shared domain entity; authority is split:
- **Identity/profile truth** (name, DOB, contact, eligibility basics): shared infrastructure with strict permissions.
- **Program-specific truth** (role on team, evaluation notes, coachable metric): owned by the relevant module (Recruiting/Performance).

Rule: shared identity fields cannot be “overwritten” by module-specific interpretations.

---

## 3. Module-Level Data Authority (Canonical)
### 3.1 Program Health
**Owns:** program health indicators, stability notes, absence-engine outputs, constraint profiles.  
**Writes by:** Program Health server actions + AI subsystem (only via bounded interfaces).  
**Reads by:** Recruiting, Performance (overlay), Roster-building.

**Never writes:** recruiting evaluations, training plan structures.

### 3.2 Recruiting
**Owns:** recruit board items, contact workflows, evaluations, scout score inputs/outputs, commit probability outputs.  
**Writes by:** Recruiting server actions + AI subsystems (bounded).  
**Reads by:** Roster-building, Program Health (read-only for audit), Performance (context only).

### 3.3 Roster-building
**Owns:** roster decisions, scholarship allocations, pipeline-to-roster mappings, attrition mitigation plans.  
**Writes by:** roster server actions.  
**Reads by:** Performance, Program Health (read-only for stability analysis).

### 3.4 Performance
**Owns:** training plans, practice schedules, readiness states, attendance outcomes (as performance inputs), athlete development notes, coachable metric (as configured).  
**Writes by:** Performance server actions.  
**Reads by:** Meet Management (operational), Program Health (signals only), Recruiting (optional downstream outcomes for closed-loop learning).

### 3.5 Meet Management
**Owns:** meets, entries, seeding artifacts, logistics checklists, results imports/attachments.  
**Writes by:** Meet server actions.  
**Reads by:** Performance (results), Program Health (risk signals), Recruiting (athlete performance history).

---

## 4. Access Rules (Write Constraints)
- Only the owning module may create/update its authoritative entities.
- Cross-module writes must use explicit “delegated contract” APIs (rare; documented).
- UI components must not write directly to tables without server actions enforcing ownership + permissions.

---

## 5. Read Projections and Derivatives
Downstream modules may maintain read models when needed for performance:
- must include source attribution (source module, version, timestamp)
- must be derivable from source truth
- must not become a second truth source

---

## 6. Audit and Attribution
All authoritative writes must have:
- actor (user/system) attribution
- timestamp
- reason/context where high-impact
- before/after diffs where feasible

---

## 7. Typical Violations (Do Not Do These)
- Performance writing recruiting evaluation fields “for convenience”.
- Recruiting writing readiness state because it wants a training signal.
- UI building “shadow state” in local storage that becomes de facto truth.
- AI writing directly to tables without bounded interfaces.

---

## 8. Implementation Notes (Enforcement)
Enforcement is performed through:
- Supabase RLS (row-level permissions)
- server actions as the canonical write path
- strict API route ownership
- database constraints where appropriate
