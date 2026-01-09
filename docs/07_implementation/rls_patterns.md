# RLS Patterns (Supabase)
**Authority Level:** Implementation Law (binding)  
**Purpose:** Standardize Row Level Security to enforce tenant isolation and predictable access control.

---

## 1. RLS Is Mandatory
Tenant scoping must be enforced at the database layer with RLS.
Server actions must also validate scope, but RLS is the non-bypassable foundation.

---

## 2. Canonical RLS Strategy
### 2.1 Principles
- **Default deny**: no access without policy
- **Tenant-scoped access**: every row is associated to tenant/program scope
- **Role-aware access**: coach vs staff vs athlete visibility is explicit
- **Predictable templates**: new tables follow standard policy patterns

### 2.2 Required Columns (typical)
Most domain tables should carry:
- `program_id` (or `org_id/tenant_id` depending on model)
- optional: `team_id`, `season_id`
- `created_by`
- `created_at`, `updated_at`

---

## 3. Policy Templates (Conceptual)
### 3.1 Read policy (member of program)
Allow SELECT if the authenticated user belongs to the program.

### 3.2 Write policy (role + scope)
Allow INSERT/UPDATE/DELETE only if:
- user is a program member with appropriate role
- row scope matches user’s program scope
- sensitive fields are restricted (e.g., scholarship allocations)

Note: enforce sensitive transitions through server actions even when RLS allows broad writes—RLS ensures scope; server actions ensure domain rules.

---

## 4. Service Actor / Elevated Privileges
Some workflows require service-level writes (webhooks, background jobs).
Rules:
- service actor paths must be tightly scoped
- never expose service keys to client paths
- service writes must still preserve tenant boundaries
- maintain audit logs for service actions

---

## 5. Common RLS Pitfalls (and how to avoid them)
- Missing `program_id` columns → cannot scope policies reliably
- Policies that join across tables without indexes → slow and fragile
- Overly broad UPDATE policies → allows UI to mutate truth without server actions
- Bypass patterns in server-side code → leaks data across tenants

---

## 6. Performance Guidance
- Index scope keys (`program_id`, `team_id`, `season_id`)
- Avoid complex policy joins where possible; prefer membership mapping tables
- Use EXPLAIN on policies for high-traffic tables

---

## 7. Change Control
Any change to RLS requires:
- a migration
- doc updates in this folder
- validation tests for scope isolation (at minimum smoke tests)

---

## 8. Reference Alignment
- Ownership rules: `02_architecture/data_authority.md`
- Data flow and provenance: `02_architecture/data_flow.md`
- Implementation boundaries: `07_implementation/service_responsibilities.md`
