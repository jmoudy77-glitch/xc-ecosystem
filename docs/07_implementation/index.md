# Implementation Index
**Authority Level:** Implementation Law (binding)  
**Purpose:** Provide the operational doctrine for how XC-Ecosystem is implemented: where logic lives, how data access is enforced, and how teams ship safely.

---

## Precedence
Implementation is subordinate to:
- `01_governance/*`
- `02_architecture/*`
- `03_domain_models/*`
- `06_ui_system/*`
- `05_ai_systems/*` (for AI-related work)

Implementation Law is controlling over code structure and recurring patterns.

---

## Canonical Documents (this folder)
1. `service_responsibilities.md` — the primary “where does this logic live” charter (already populated)
2. `server_actions.md` — preferred server-action patterns and boundaries
3. `api_patterns.md` — route handler conventions (especially integrations/webhooks)
4. `rls_patterns.md` — Supabase Row Level Security strategy and templates
5. `data_models.md` — practical data modeling rules aligned to Architecture Law
6. `billing_and_plans.md` — Stripe integration and entitlements enforcement
7. `developer_handbook.md` — day-to-day engineering practice and guardrails

---

## Non-negotiables (summary)
- **Server actions are the canonical domain write path.**
- **RLS enforces tenant isolation; server actions also validate scope.**
- **API routes exist for integrations/webhooks; they delegate, they don’t own business logic.**
- **Derived analytics are auditable and never overwrite facts.**
- **Any schema/RLS change requires migrations + doc updates.**
