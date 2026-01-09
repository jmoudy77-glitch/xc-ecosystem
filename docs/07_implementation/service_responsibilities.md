# Service Responsibilities
**Authority Level:** Implementation Law (binding)  
**Precedence:** Subordinate to Governance + Architecture + Domain + UI Law; controlling for code structure  
**Purpose:** Clarify responsibilities between server actions, API routes, client components, and background jobs.

---

## 1. Guiding Principle
**Domain truth and ownership are enforced server-side.**

UI orchestrates workflows.  
Server actions enforce ownership, permissions, entitlements, and auditability.  
API routes exist for external interfaces.  
Background jobs handle long-running compute and scheduled work.

---

## 2. Server Actions (Primary Domain Boundary)
Server actions are the canonical home for:
- module-owned writes (create/update/delete)
- permission checks (role + tenant)
- entitlement checks (plan/feature gates)
- audit logging (high-impact decisions)
- orchestration (triggering derived computations)
- transactional coordination across tables owned by the same module

### 2.1 Rules
- Client components should not embed complex ownership logic.
- Server actions must validate:
  - tenant/program/team scope
  - role permissions
  - module ownership
  - input correctness
- Prefer reusable server actions to prevent duplication and drift.

### 2.2 Anti-patterns
- Writing directly from client to Supabase tables without server action mediation.
- Duplicating the same write logic across pages.
- Mixing multiple module ownership writes in one action without explicit contract (rare, documented).

---

## 3. API Routes (Integrations Boundary)
API routes are for:
- **Stripe webhooks**
- third-party callbacks (results ingestion, external auth, etc.)
- narrowly scoped public endpoints (explicitly required)

### 3.1 Rules
- Routes must be idempotent where applicable (webhooks).
- Routes should delegate to internal services/server actions for domain writes.
- Routes must not become “mini-apps” with duplicated business logic.

---

## 4. Client Components (UI Orchestration Layer)
Client components are responsible for:
- interactive UX (drag-and-drop, modals, progressive disclosure)
- calling server actions
- optimistic UI where safe and reversible
- presenting state and consequences clearly (UI Law)

### 4.1 Rules
- Client should not decide data ownership.
- Client should not perform privileged queries that bypass server-side checks.
- Keep derived analytics presentation clearly labeled (analytics vs facts).

---

## 5. Background Jobs (Async Workloads)
Background jobs handle:
- long-running analytics/projections
- batch recomputation
- scheduled maintenance tasks
- notification fan-out
- ingestion pipelines (where async is required)

### 5.1 Rules
- Jobs must run with explicit service credentials and strict scoping.
- Jobs must produce auditable outputs (timestamps, versioning, attribution).
- Jobs must not silently mutate high-impact truth without governance controls.

---

## 6. Stripe Webhooks (Special Case)
Webhook processing must:
- verify signatures
- be idempotent (dedupe by event id)
- write subscription/entitlement state through a controlled service boundary
- emit audit logs for entitlement changes
- avoid calling UI-specific code paths

---

## 7. AI Responsibilities
AI systems must:
- declare inputs/outputs in `05_ai_systems/*`
- read canonical facts
- write derived outputs with versioning + provenance (see `02_architecture/data_flow.md`)
- expose rationale and uncertainty
- never “decide” irreversible actions

AI execution lives in:
- server actions (small, synchronous inference)
- background jobs (batch projections)

---

## 8. Practical “Where Should This Live?” Decision Tree
1) Does it change authoritative data? → **Server action**  
2) Is it an external callback/webhook? → **API route** (delegate internally)  
3) Is it only UI behavior/interaction? → **Client component**  
4) Is it long-running compute/scheduled? → **Background job**  
5) Is it cross-module? → **Explicit contract + architecture update**

---

## 9. Enforcement Expectations
- RLS is mandatory but not sufficient; server actions must still scope and validate.
- The codebase structure should mirror module boundaries.
- If implementation cannot express doctrine cleanly, update Implementation Law and patterns—do not hack around it.
