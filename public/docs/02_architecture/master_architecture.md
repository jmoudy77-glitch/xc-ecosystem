# Master Architecture

## Purpose
Describe the top-level architecture of XC‑Ecosystem as a multi‑tenant SaaS platform.

## Scope
Covers: Next.js App Router, Supabase (Postgres + RLS), Stripe billing, AI modules, and tenant separation.

## Authoritative statements
- The system is multi‑tenant: tenant isolation is enforced via **Supabase RLS** and consistent scoping in server actions.
- Next.js App Router is the primary web framework; server components and route handlers are used appropriately.
- Billing uses Stripe with plan semantics separating **program/org** and **athlete** subscriptions.
- AI modules (Scout Score, Commit Probability, Pipeline Projection, Absence Engine) must read from canonical data and produce auditable outputs.

## System interactions
- Module boundaries are defined in `module_boundaries.md`.
- Data movement rules are defined in `data_flow.md`.
- Implementation patterns live in `07_implementation/*`.

## Sources
- `00-index.md`
- `architecture/api-architecture.md`
- `architecture/data-flow.md`
- `architecture/domain-architecture.md`
- `architecture/multi-tenant-architecture.md`
- `architecture/system-architecture.md`
- `function_area_notes/platform_architecture_devops.md`
- `index.md`
- `master-architecture.md`
- `security/rls-framework.md`
