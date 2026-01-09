# Program Domain Model
**Authority Level:** Domain Model (binding)  
**Purpose:** Define canonical meaning for a Program as an institution with continuity, philosophy, staff, and operational scope.

---

## 1. Definition
A **Program** is the institutional unit that owns:
- coaching doctrine (philosophy)
- staff roles and permissions
- teams (XC and/or Track & Field)
- seasons and operational cycles
- recruiting, roster, performance, and meet operations
- billing/entitlements (program/org plan semantics)

Programs persist across years and must preserve institutional memory.

---

## 2. Core Sub-Entities
### 2.1 Program Identity
- name, school affiliation, branding tokens
- competition levels (HS/college)
- sport coverage (XC, Track & Field, or both)
- geographic/organizational context

### 2.2 Program Philosophy (Governance-Controlled)
Philosophy is a first-class entity (see Governance).
It must be structured enough to govern:
- priorities and tradeoffs
- default operating modes
- approved exceptions and constraints

### 2.3 Staff & Roles
- head coach / owner authority
- assistant coaches / delegated roles
- admin/billing roles
All permissions must be auditable.

### 2.4 Teams (Within a Program)
Programs may include multiple teams (e.g., men/women, varsity/JV).
Team is an operational partition under the Program identity.

---

## 3. Stored Facts vs Derived Analytics
Stored facts:
- staff assignments and permissions
- team structures
- season definitions and mode changes
- recruiting/roster/performance records (via their domains)

Derived analytics:
- program health classifications
- pipeline projections
- aggregate performance readiness summaries

---

## 4. Boundaries
- Program is the tenancy scope for most coach-facing operations.
- Team is a sub-scope; all team-level artifacts remain under program governance.
- Sport-specific configurations (XC vs T&F) are program-configured and must not fork doctrine unless intentionally documented.

---

## 5. References
- `01_governance/*`
- `02_architecture/master_architecture.md`
- `02_architecture/data_authority.md`
