# Server Actions
**Authority Level:** Implementation Law (binding)  
**Purpose:** Define the preferred pattern for centralizing product data logic and eliminating scattered queries.

---

## 1. Why Server Actions Are Canonical
Server actions are the platform’s domain boundary:
- they enforce **module ownership**
- they enforce **permissions and entitlements**
- they provide a single place for **audit logging**
- they prevent UI from becoming an accidental domain layer

A client component orchestrates interaction; it does not own domain truth.

---

## 2. What Belongs in a Server Action
Server actions should own:
- module-owned creates/updates/deletes
- validations (input + state transition rules)
- tenant/program/team scope checks
- entitlement checks (plan gates)
- audit log creation for high-impact actions
- orchestration (triggering jobs, recomputations, notifications)

Server actions may also provide canonical reads for complex, permissioned queries (especially where joins would otherwise leak information).

---

## 3. What Must Not Live in Server Actions
Server actions must not:
- embed UI-only state or presentation logic
- become “god functions” that perform unrelated cross-module writes
- silently bypass RLS/authorization
- return excessive data outside the requesting user’s scope

---

## 4. Naming and Placement Conventions
### 4.1 Ownership mirrors modules
Organize server actions by module ownership:
- Program Health actions
- Recruiting actions
- Roster & Scholarships actions
- Performance actions
- Meet actions
- Shared platform actions (identity, billing, entitlements)

### 4.2 Function naming
Use verbs that describe the domain intent:
- `createRecruitBoardItem`
- `moveRecruitPipelineState`
- `setAthleteAvailability`
- `finalizeRosterScenario`
- `recordMeetResultImport`

Avoid ambiguous names like `updateThing` unless the scope is narrow and obvious.

---

## 5. Required Server Action Guardrails
Every server action that reads or writes product data must:
1) Determine caller identity (auth)  
2) Validate tenant/program/team/season scope  
3) Enforce role permissions  
4) Enforce plan entitlements (where relevant)  
5) Enforce module ownership (only write owned truth)  
6) Write audit records for high-impact decisions  
7) Return minimal necessary data

---

## 6. Supabase in Next.js App Router (cookie pattern)
When using Supabase in Next.js Server Components, use the working cookie access pattern to avoid `.get` typing issues:

```ts
const cookieStore = cookies() as any;
cookieStore.get(name)?.value
```

This mirrors route-handler `req.cookies.get(name)?.value` behavior and prevents recurring TS errors.

---

## 7. Transaction and Consistency Guidance
- Prefer single-module transactions where possible.
- For multi-step workflows, store an explicit workflow state or event record rather than relying on UI “remembering” state.
- If derived analytics must run after a write, store the fact first, then enqueue/trigger derivation.

---

## 8. Testing Expectations
For any server action that is high-impact:
- include unit tests for validation and permissions
- include integration tests for RLS interactions where feasible
- include regression tests for known pitfalls (scope leaks, entitlement bypass)

---

## 9. Anti-Patterns (Do Not Do These)
- Inline client queries that write to authoritative tables
- Scattered duplicates of the same write logic across pages
- “Quick fix” bypass of RLS via elevated keys in user-request paths
- Cross-module writes without explicit architectural contract updates
