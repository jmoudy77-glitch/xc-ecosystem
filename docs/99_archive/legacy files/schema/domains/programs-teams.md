# Programs & Teams Schema

This domain defines schools, programs, teams, and program staff.

---

## 1. Schools

### 1.1 `schools`
Represents educational institutions.

- Name, level
- Location fields
- Branding fields (colors, logo)
- Identity JSON for multi-sport metadata

---

## 2. Programs

### 2.1 `programs`
A program within a school.

- `school_id`
- `name`
- `sport`, `gender`, `level`, `season`

Represents the tenant boundary for most data.

---

## 3. Program Members

### 3.1 `program_members`
Maps users → program staff roles.

- `program_id`
- `user_id`
- `role`
- Created timestamps

Central for RLS.

---

### 3.2 `memberships`
Maps users → organizations (`organization_id`).

Supports multi-organization contexts.

---

## 4. Teams

### 4.1 `teams`
Within a program, defines discrete teams:

- Men’s XC
- Women’s XC
- Men’s T&F
- Women’s T&F

Carries scholarship budgets and team metadata.

---

## 5. RLS Principles

- Program members can see majority of program-scoped tables.
- School ownership is mostly administrative and branding.
- Teams inherit visibility from programs.

