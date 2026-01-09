# Developer Handbook
**Authority Level:** Implementation Law (binding as operating standard)  
**Purpose:** Capture recurring development practices and guardrails for building XC-Ecosystem safely and efficiently.

---

## 1. How We Build (Operating Principles)
- Prefer architectural approaches that won’t need refactoring later.
- Centralize data logic in reusable server actions instead of inline queries.
- Preserve module boundaries: do not mix ownership.
- Treat docs as the constitution: update them when reality changes.

---

## 2. Local Dev Workflow (Canonical)
- Use consistent environment variables and `.env` discipline.
- Run migrations through a controlled process; do not “hot fix” production.
- Prefer repeatable scripts over fragile aliases; keep commands robust.

---

## 3. Data Access Rules (Non-negotiable)
- RLS is mandatory; server actions still validate scope.
- No direct client writes to authoritative tables outside controlled paths.
- Avoid “service key in user path” patterns.

---

## 4. Supabase + Next.js App Router Notes
### 4.1 Cookie pattern (server components)
Use the working cookie access pattern to avoid TS `.get` errors:

```ts
const cookieStore = cookies() as any;
cookieStore.get(name)?.value
```

### 4.2 Route handlers
Route handlers may use `req.cookies.get(name)?.value` patterns; keep handlers thin and delegate to internal services.

---

## 5. Schema and RLS Change Protocol
Any schema or RLS change requires:
1) migration (SQL)  
2) updated docs (schema + relevant lawbooks)  
3) smoke test for tenant isolation  
4) review of any downstream impacts (AI outputs, UI state labels)

---

## 6. Quality Gates
- Prefer type-safe boundaries; avoid “any” unless required at integration seams.
- Write tests for high-impact actions (billing, roster allocations, pipeline transitions).
- Add regression tests when bugs reoccur.

---

## 7. Common Pitfalls (Avoid)
- Mixing module ownership in one write path without contracts.
- Ad-hoc joins in UI that leak cross-scope data.
- Silent automation (especially AI) that mutates truth.
- UI that hides state consequences.

---

## 8. Documentation Discipline
When you add or change:
- a state machine → update `02_architecture/state_transitions.md` and relevant module doc
- a data ownership rule → update `02_architecture/data_authority.md`
- an AI output → update `05_ai_systems/*` and output contract
- a deep workflow → update `06_ui_system/interaction_contracts.md`

---

## 9. Reference Map
- Service boundaries: `07_implementation/service_responsibilities.md`
- Server actions: `07_implementation/server_actions.md`
- API routes: `07_implementation/api_patterns.md`
- RLS: `07_implementation/rls_patterns.md`
- Billing: `07_implementation/billing_and_plans.md`
- Domain meaning: `03_domain_models/*`
