# RLS Framework

Row-Level Security (RLS) is the primary mechanism for enforcing multi-tenant isolation and privacy in the XC-Ecosystem. This document defines standardized patterns and expectations for all program- and athlete-scoped tables.

---

## 1. Principles

1. **Program Isolation**
   - No program should ever see another program's internal data (rosters, notes, evaluations, recruiting objects), unless explicitly modeled as public.

2. **Global Athlete Identity, Local Views**
   - An athlete can appear in multiple programs (HS, college, transfers).
   - Each program's notes and scores remain private to that program.

3. **Least Privilege**
   - Users should only see and mutate rows required for their role and current context.

4. **DB-Enforced Security**
   - RLS enforces access at the database level, not just in application code.

---

## 2. Common Patterns

### 2.1 Program-Scoped Tables

Tables like `program_athletes`, `program_recruits`, `program_scoring_profiles`, `program_athlete_scores`, `team_roster`, `team_seasons` are **program-scoped**.

Standard pattern:

```sql
-- Example for a program-scoped table
create policy "allow_program_members_select"
on public.program_athletes
for select
using (
  program_id in (
    select pm.program_id
    from public.program_members pm
    where pm.user_id = auth.uid()
  )
);

create policy "allow_program_members_insert"
on public.program_athletes
for insert
with check (
  program_id in (
    select pm.program_id
    from public.program_members pm
    where pm.user_id = auth.uid()
  )
);

-- Similar for update/delete where appropriate
```

Rules:

- Always tie `program_id` to `program_members.user_id = auth.uid()`.
- Never rely solely on client-provided program IDs.

---

### 2.2 Team-Scoped & Season-Scoped Tables

`team_roster`, `team_seasons`, and similar tables combine program scope with team/season context.

Pattern:

- First, restrict by `program_id` using the same program-membership check.
- Optionally, ensure the team/season belongs to that program using FK relationships and additional checks.

---

### 2.3 Global Tables with Public/Private Fields

Global tables like `athletes`, `schools`, or (future) `events_catalog` can have:

- **Public fields** (e.g., school name, athlete name and grad year).
- **Private fields** (e.g., personal contact info, internal IDs).

Approaches:

- Option A: Split into public vs private tables.
- Option B: Use views that expose only certain columns publicly.
- Option C: Implement RLS that returns only non-sensitive columns to non-owners.

---

### 2.4 Athlete-Specific Views

For athlete-facing experience:

- RLS conditions typically filter on `athletes.user_id = auth.uid()` or `users.id = auth.uid()` plus relationships.
- Allow read access to:
  - Their own profile fields.
  - Their official/verified results.
  - Their own training sessions.
- For write access, restrict fields (e.g., only certain columns via `with check`).

---

## 3. Identity Resolution

RLS policies often start from the authenticated user:

- `auth.uid()` identifies the authenticated user’s UUID in the auth system.
- A join from `users.auth_id` or equivalent maps to the internal `users` row.
- Further joins from `users.id` reach:
  - `program_members`
  - `memberships`
  - `athletes` (when the user is an athlete)

Helper views or functions can simplify this mapping.

---

## 4. Example Policies by Domain

### 4.1 Recruiting (Program-Scoped)

For `program_recruits`:

- Select/Insert/Update/Delete allowed only if:
  - `program_id` is in the set of programs where the user is a member.
  - Role is at least Assistant Coach (enforced either in RLS via role column or in application logic).

### 4.2 Roster & Seasons

For `team_roster`:

- Select allowed for all program staff of the team’s program.
- Insert/Update/Delete restricted to roles:
  - Program Admin, Head Coach, Director of Ops (and optionally Assistant Coach).
- Athletes may have a separate view or policy to see only their own `team_roster` row.

### 4.3 Training Sessions

For `athlete_training_sessions`:

- Program staff may see sessions for athletes rostered on their teams.
- Athletes may see and edit sessions where `athlete_id` points to their own athlete profile.
- No cross-program visibility.

---

## 5. Service Role & Background Tasks

Certain operations (e.g., Stripe webhooks, scheduled maintenance) require bypassing RLS:

- These use a service role key.
- The code must still respect the logical boundaries defined by docs and must not leak data.

---

## 6. Documentation & Enforcement

Every time a new table is added:

1. Identify its domain (and owning doc under `/docs/schema/domains`).
2. Decide if it's program-scoped, global, or athlete-scoped.
3. Write RLS policies using the patterns in this document.
4. Update `/docs/security/permissions-matrix.md` if new permissions are required.

This ensures consistency and prevents accidental overexposure as the schema grows.
