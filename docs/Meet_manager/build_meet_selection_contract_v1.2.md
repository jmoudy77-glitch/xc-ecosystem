# Meet Manager — Build Meet Selection Contract v1.2 (LOCKED)

**File:** `/docs/Meet_manager/build_meet_selection_contract_v1.2.md`  
**Status:** LOCKED  
**Scope:** Build phase only (Initiate → Build → Compete → Review workflow)

---

## Purpose

This contract defines **how meet context is selected inside the Build phase** from a coach mental-flow perspective.

Build is a **single continuous surface**, not a two-page flow.  
Meet selection and roster/entry planning occur on the **same page**.

---

## Core Principle

When a coach enters **Build**, the first question they must answer is:

**“What am I building right now, and in what capacity?”**

This is answered explicitly through **role-aware meet selection**, not routing.

---

## Meet Selection Location

- Meet selection occurs **inside the Build workflow header**
- Selection is **required** before roster or entry planning is shown
- There is no separate “Build landing” vs “Build workspace”

---

## Header Affordances (Authoritative)

On the **right side of the Build workflow header**, render **two horizontally spaced dropdowns**:

### 1) Hosted Meets dropdown
- Lists meets where the program is a **HOST**
- Selecting a value means:
  - “I am building/configuring the meet itself”
  - Host-authoritative responsibilities apply (events, structure, updates)

### 2) Attending Meets dropdown
- Lists meets where the program is an **ATTENDEE**
- Selecting a value means:
  - “I am building my program’s roster and entries for this meet”
  - Program-scoped planning only

---

## Hosted ↔ Attending Relationship Rule

- For every hosted meet, there exists a corresponding attended context
- Even when the host and attendee refer to the same real-world meet:
  - The coach must **explicitly choose which role they are operating under**
  - The UI must not infer or auto-switch roles

This enforces clear “hat switching” for the coach.

---

## Workspace Gating Rules

- Until **one dropdown selection is made**:
  - Roster UI is not rendered
  - Entry allocation UI is not rendered
  - Investigate panels remain informational only
- After selection:
  - Build workspace locks to (meet_id, role)
  - Roster-first planning flow begins
  - All subsequent actions are interpreted through the selected role

---

## Explicit Exclusions

- ❌ No pre-Build meet selection page
- ❌ No automatic role inference
- ❌ No navigation away from Build to choose meet context
- ❌ No mixing host and attendee controls in a single context

---

## Relationship to Routing

- URLs may include `[meetId]` for deep-linking or refresh stability
- Routing must **not** be the primary mechanism for meet selection
- UI state is the source of truth for “what is being built”

---

## Stability Note

This contract is intentionally locked **before UI implementation** to prevent:
- accidental role confusion
- fragmented Build experiences
- future refactors when host/attendee logic expands

