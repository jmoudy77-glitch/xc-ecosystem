# NEW THREAD HANDOFF — Recruiting Module (M1 Complete → M3 Next)
**Date:** 2026-01-03 (America/Chicago)  
**Repo:** `dev/xc-ecosytem/`  
**Module:** Recruiting (Stabilization Workspace)

---

## 1) Binding Recruiting Contracts (authoritative constraints)
**Contract #1 — Boundary**
- Recruiting operates exclusively on **recruitable** deficits (mitigatable via athlete additions).
- Non-recruitable deficits are out of scope and belong to Program Health.
- Recruiting consumes Program Health outputs; Program Health retains diagnostic authority.

**Contract #2 — Coach Ownership (non-terminal)**
- Recruiting is continuous and coach-owned.
- System may signal sufficiency conditions (tone decay) but never declares “done/complete/solved”.
- Strongest outward phrasing allowed: **“Recruitable risk is within defined tolerances.”**

**Contract #3 — AI Agency Posture**
- Comparative, advisory only.
- No obligation/certainty; adapt silently to coach decisions.
- Cohorts are risk-reduction tiers.

**Contract #4 — Residual Absence Awareness**
- Non-recruitable absences are completely invisible in Recruiting UI (no counts, icons, summaries, or implication).

**Contract #5 — Coach Mental Model**
- Primary metaphor: Stabilization; supporting mechanic: slot filling.
- Canonical coach statement: **“I’m stabilizing my roster for this season.”**
- Progress is status bands + subtle deltas; no completion bars.

---

## 2) What M1 is (precise)
M1 is **not an engine**. It is the Recruiting **read-and-interpret boundary layer**:
- Reads Program Health canonical outputs
- Filters to recruitable-only deficits using explicit classification
- Exposes RLS-safe RPC read surfaces for UI
- Stores non-authoritative state signals (tone decay posture)
- Provides audit/validation surfaces to guarantee “no non-recruitable leaks”

M1 does not diagnose, forecast, or mutate Program Health diagnostic records.

---

## 3) Data-layer completion status (M1)
### 3.1 Program Health annotation (required for boundary)
- Absence objects include:
  - `details.recruitability: 'recruitable' | 'non_recruitable'`

### 3.2 Recruiting M1 read surfaces
- `recruiting_recruitable_deficits` (recruitable-only read model)
- `rpc_recruiting_recruitable_deficits_default_horizon(...)`
- `rpc_recruiting_recruitable_deficits_default_horizon(...)` (deterministic horizon selection)
- `rpc_recruiting_stabilization_status(...)`
- `recruiting_state_signals` (+ latest-signal RPC)
- Validation/Audit:
  - `recruiting_m1_validation_no_leak`
  - `rpc_recruiting_m1_validation_status_rowcount(...)`
  - `recruiting_m1_audit_view`
- Security:
  - `20260103001800_recruiting_rls_and_grants.sql` fixed and applied

### 3.3 Current program data (verified)
Program ID: `6252113e-0eb1-482f-8438-50415db05617`  
Counts:
- `recruiting_ledger`: 2
- `recruiting_snapshots`: 0
- `program_health_absences`: 2
- `program_health_snapshots`: 2

Latest snapshot (example):
- horizon: H2
- keys: `absences`, `summary`
- absence object keys include: `details`, `sector_key`, etc.

---

## 4) UI completion status (A path completed)
Recruiting M1 UI is implemented and live.

### 4.1 Route
- `app/app/programs/[programId]/(athletic)/recruiting/page.tsx`

### 4.2 Components/actions
- Server action: `app/app/actions/recruiting/readRecruitingM1View.ts`
- Client UI: `app/app/programs/[programId]/(athletic)/recruiting/RecruitingM1Client.tsx`

### 4.3 Behavior guarantees
- UI surfaces **only recruitable deficits**
- Displays stabilization band + recruitable deficit count
- No non-recruitable presence (no hints or implied totals)
- No completion semantics (“done”) and no coercive language

---

## 5) Governance and promotion ledger
Recruiting promotion ledger created and backfilled:
- `public/docs/01_governance/promotions/RECRUITING_LEDGER.md`

Includes promotions:
- 0010–0018, 0020–0024 (recruitability annotation, M1 read model/RPCs, indexes, state signals, RLS, validation/audit, bootstrap).

---

## 6) Next milestone: M3 (Candidate impact + cohort ranking)
M3 introduces **write paths** and must remain contract-aligned:

### 6.1 What M3 is allowed to do
- Produce comparative, advisory candidate impacts:
  - “Among available options, this athlete reduces recruitable risk the most in X.”
- Store advisory outputs in:
  - `recruiting_candidate_impacts`

### 6.2 What M3 must not do
- Must not mutate Program Health diagnostic records
- Must not introduce non-recruitable data into Recruiting surfaces
- Must not create obligation/certainty posture
- Must not produce “done/solved/completed” semantics

### 6.3 Recommended M3 approach (durable)
- Candidate impact computation should:
  - reference recruitable deficits only
  - produce tiered cohorts (risk-reduction bands)
  - store provenance + inputs hash (auditability)
  - adapt silently to coach decisions

---

## 7) Execution discipline for future promotions
- All changes delivered as a **single atomic Codex promotion block**
- Required commands:
  - `supabase migration up`
  - `supabase db push`
- Each promotion must commit + push
- If a migration fails, fix that migration file directly (do not attempt “fix in later migration”).

