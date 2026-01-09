# Master Architecture
**Authority Level:** Architecture Law (binding)  
**Precedence:** Subordinate to Governance; controlling over Domain Models, Modules, AI, UI, Implementation  
**Purpose:** Describe the top-level physical architecture of the XC‑Ecosystem as a multi‑tenant SaaS platform.

---

## 1. System Overview
XC‑Ecosystem is a multi‑tenant SaaS platform built around:

- **Next.js App Router** as the primary application framework
- **Supabase** (Postgres + RLS + Auth + Storage) as the data and auth plane
- **Stripe** for billing, subscriptions, and entitlements
- **AI subsystems** for analysis and forecasting (bounded by Governance)
- **Server Actions** as the canonical domain write path

The system is designed to enforce governance doctrine through architecture:
- tenant isolation
- module ownership
- auditability
- predictable data flow
- bounded AI jurisdiction

---

## 2. Tenancy Model (Non-Negotiable)
### 2.1 Tenant Isolation
Tenant separation is enforced by:
- **Supabase RLS** at the database layer
- consistent tenant scoping in **server actions**
- strict program/team scoping for all writes and reads

Rule: If the UI can construct a query that crosses tenants, the implementation is invalid.

### 2.2 Primary Scope Identifiers
Canonical scoping identifiers (where applicable):
- `org_id` / `tenant_id`
- `program_id`
- `team_id`
- `season_id`
- `user_id`

The exact naming may vary by schema, but the scoping intent is controlling.

---

## 3. Application Layers
### 3.1 UI Layer (Next.js)
- Server Components for data-heavy, auth-aware reads.
- Client Components for interactive workflows.
- UI must obey `/docs/06_ui_system/*` (interaction contracts, minimal-touch doctrine).

### 3.2 Domain Layer (Server Actions)
Server actions are the canonical entry point for:
- validated writes
- ownership enforcement
- entitlement checks
- audit logging
- orchestration of derived computations/jobs

Rule: Client components orchestrate; they do not own domain logic.

### 3.3 Integration Layer (API Routes)
API routes are reserved for:
- Stripe webhooks
- external callbacks/integrations
- narrowly scoped public endpoints (when explicitly required)

Rule: If a route handler starts to look like a domain service, it belongs as a server action.

### 3.4 Data Layer (Supabase)
- Postgres as source of truth
- RLS as primary guard
- constraints and indexes as enforcement
- Storage for media and documents (with policy controls)

---

## 4. Module Architecture (How Features Partition)
The system is organized by module boundaries (see `module_boundaries.md`):

**Program Health → Recruiting → Roster-building → Performance → Meet Management**

Each module owns:
- its authoritative data
- its state transitions
- its decision surfaces
- its AI attachments (bounded)

Cross-module dependencies must be expressed through:
- explicit server-action contracts
- event records
- read-only projections

---

## 5. Billing & Entitlements (Stripe)
### 5.1 Plan Separation
Billing semantics distinguish:
- **Program/Org plans** (coach/program capabilities)
- **Athlete plans** (athlete-facing capabilities where applicable)

Entitlements are enforced server-side:
- by feature flags/plan checks in server actions
- reinforced by RLS where appropriate

### 5.2 Webhook Authority
Stripe webhooks are the authoritative source for subscription state changes.
Webhook processing must:
- be idempotent
- write through a controlled service boundary
- produce audit logs for entitlement changes

---

## 6. AI Systems Placement
AI systems are bounded subsystems that:
- read canonical facts
- produce derived analytics with auditability
- never mutate truth directly without explicit, bounded interfaces
- expose confidence and rationale

AI workloads may run:
- synchronously (small, low-latency inference)
- asynchronously (jobs for projections and batch evaluation)

All AI behavior must conform to:
- Governance charter (`01_governance/*`)
- Data Flow rules (`02_architecture/data_flow.md`)

---

## 7. Reliability and Auditability
### 7.1 Audit Logging
High-impact decisions and state transitions must be attributable:
- actor/system identity
- timestamp
- before/after where feasible
- rationale where required (see `01_governance/decision_protocol.md`)

### 7.2 Observability (Recommended)
Track:
- webhook failures
- RLS denials
- job failures
- AI run outcomes and version drift
- performance and latency at key workflows

---

## 8. Implementation Constraints (Enforced by Architecture)
- Prefer durable server actions over inline queries.
- Enforce module ownership via directory + route structure.
- Keep AI outputs separated from facts (analytics vs truth).
- Preserve causality transparency (provenance everywhere).

---

## 9. References
- `02_architecture/module_boundaries.md`
- `02_architecture/data_authority.md`
- `02_architecture/data_flow.md`
- `02_architecture/event_causality.md`
- `07_implementation/*`
