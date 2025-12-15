# Identity & Users Schema

Defines application-level users, authentication, memberships, and roles.

---

## 1. `users`

- `auth_id` – Supabase auth linkage
- `email`, `name`
- Subscription fields
- Avatar
- Flags (AI assistant enablement)

Represents a login identity.

---

## 2. Memberships

### 2.1 `memberships`

Maps users → organizations.

- `organization_id`
- `user_id`
- `role` (custom enum)

---

## 3. Program Memberships

### 3.1 `program_members`

Maps users → programs.

- Staff roles:
  - Admin
  - Head Coach
  - Assistant
  - GA
  - Volunteer
  - Ops

Key for determining access across all program-scoped tables.

---

## 4. Athletes Linked to Users

- `athletes.user_id` links an athlete profile to the login user.
- Controls athlete self-service access.

---

## 5. RLS

- Row visibility based on:
  - Auth user ID
  - Program membership
  - Organization membership
- Users can only view/edit their own profile.

