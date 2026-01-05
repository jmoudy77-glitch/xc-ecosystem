# Recruiting (Operational Module)
**Authority Level:** Operational Module (binding)  
**Scope:** Coach-facing recruiting workflows (stabilization + pipeline operations)  
**Dependencies:** `01_governance/*`, `03_domain_models/recruiting_domain.md`, `03_domain_models/program_health_domain.md`  
**Boundary:** Downstream of Program Health; upstream of roster composition and allocation

---

## 0. Binding contracts (authoritative)
Recruiting is governed by the following constraints:

1) **Boundary**
- Recruiting operates exclusively on **recruitable deficits** (mitigatable via athlete additions).
- **Non-recruitable deficits are out of scope** and remain exclusively in Program Health.
- Recruiting consumes Program Health diagnostics but does not overwrite Program Health authority.

2) **Coach Ownership (non-terminal)**
- Recruiting is continuous and coach-owned.
- System may signal sufficiency conditions via tone decay, but never declares “done”.
- Strongest outward phrasing allowed: **“Recruitable risk is within defined tolerances.”**

3) **AI Agency Posture**
- Comparative and advisory only. No obligation and no certainty claims.
- Cohorts are risk-reduction tiers.

4) **Residual Absence Awareness**
- Non-recruitable absences are **completely invisible** inside Recruiting (no counts, icons, summaries, or implication).

5) **Coach Mental Model**
- Primary metaphor: **Stabilization** (supporting mechanic: slot filling).
- Canonical coach statement: **“I’m stabilizing my roster for this season.”**
- Progress is bands + subtle deltas; never a completion bar.

---

## 1. What this module is for
Recruiting has two coach-facing surfaces:

### 1.1 Stabilization Workspace (M1)
A controlled workspace that surfaces only **recruitable** deficits derived from Program Health outputs.
Purpose:
- make roster stabilization actionable without leaking non-recruitable diagnostics
- provide a durable “what Recruiting sees” surface for downstream advisory tooling

### 1.2 Pipeline Operating Center
The pipeline operating center is the recruit board and evaluation workflow.
Purpose:
- manage the day-to-day pipeline (contact cadence, evaluation artifacts, conversions)

---

## 2. M1 implementation (current)
Recruiting M1 is implemented as a read-and-interpret layer (not an engine):

### 2.1 Inputs (authoritative)
- `program_health_snapshots.full_payload.absences[]` (Program Health canonical output)
- Each absence must carry `details.recruitability` = `recruitable | non_recruitable`

### 2.2 Boundary enforcement
Recruiting must **only** surface absences with:
- `details.recruitability = 'recruitable'`

Non-recruitable absences must never appear in Recruiting UI or Recruiting analytics surfaces.

### 2.3 Public read surfaces (DB)
- `recruiting_recruitable_deficits` (recruitable-only read model)
- `rpc_recruiting_recruitable_deficits_default_horizon(...)` (deterministic horizon defaulting)
- `rpc_recruiting_stabilization_status(...)` (status band computation)
- `recruiting_state_signals` (non-authoritative state signal storage)
- Validation/Audit:
  - `recruiting_m1_validation_no_leak`
  - `rpc_recruiting_m1_validation_status_rowcount(...)`
  - `recruiting_m1_audit_view`

### 2.4 UI route (App Router)
- `app/programs/[programId]/(athletic)/recruiting/page.tsx`
- `RecruitingM1Client.tsx`
- Server action: `app/actions/recruiting/readRecruitingM1View.ts`

---

## 3. Pipeline workflows (still valid; downstream of M1)
### 3.1 Recruiting Board (central surface)
Goal: one board that feels like a staff war-room.
- columns by pipeline state
- cards show: priority, last contact, next action, key signals
- drag-and-drop between states
- quick actions: log contact, add note, schedule follow-up

Rules:
- no silent automation of state changes
- AI may suggest transitions; humans confirm

### 3.2 Evaluation Workflow (fast + interpretable)
- evaluation template (events, results, fit notes, coachable metric)
- attach media/accolades where relevant)
- generate/refresh Scout Score with rationale

---

## 4. Non-negotiables
- Recruiting never displays non-recruitable deficits in any form.
- Recruiting never declares completion.
- AI is advisory and comparative; no certainty/obligation posture.
- Minimal-touch remains mandatory for high-frequency actions.
