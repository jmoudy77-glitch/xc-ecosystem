# Meet Manager — Build Roster Selection UX Contract (Attending) v1.2 (LOCKED)

**File:** `/docs/Meet_manager/build_roster_selection_ux_contract_attending_v1.2.md`  
**Status:** LOCKED  
**Scope:** Build phase (Attending meet context only)

---

## Purpose

Lock the coach-facing UX meaning and gating behavior for **attending roster selection** inside Build.

This contract binds:
- the first decision surface in Build (attending)
- the meaning of “Add / Remove”
- readiness gates for subsequent Build surfaces (Entries, then Events)

---

## Context & Entry

Build is a **single continuous surface** (`/programs/[programId]/meets/builder`) with meet selection inside the header.

This contract applies when:
- the coach selects a meet in the **Attending Meets** dropdown
- the Build surface enters **attending context**

---

## Core Coach Question

When attending context is selected, the first question Build answers is:

**“Who am I bringing to this meet?”**

Roster selection is the foundation for all later planning work.

---

## UI Surface Definition

### Roster Selection Surface (Primary)

- Display a list of program athletes.
- Each athlete row has a single minimal-touch action:
  - **Add** (if not currently on roster)
  - **Remove** (if currently on roster)

No other interactions are required in v1.2 to establish attendance intent.

---

## Action Semantics

### Add
- “Add” means: the athlete is **intended to attend** this meet for planning purposes.
- System state:
  - Create/ensure `meet_rosters` header row exists for `(meet_id, program_id)`.
  - Insert a membership row in `meet_roster_athletes` with:
    - `attendance_state = 'attending'` (default)

### Remove
- “Remove” means: the athlete is **not attending** for planning purposes.
- System state:
  - Remove the membership row from `meet_roster_athletes` for `(meet_id, program_id, athlete_id)`.
- Removing the last athlete does **not** delete the roster header by default (header persists).

---

## Attendance States (v1.2)

- Only one attendance state is in-scope:
  - `attending`

Explicitly deferred:
- `tentative`
- `out`
- availability / injury / eligibility sub-states

---

## Gating Rules (Build)

### Roster → Entries
- Entries planning surfaces must remain **gated** until:
  - a meet is selected (attending context), and
  - roster has at least one athlete selected

### Roster → Events
- Events may be viewable earlier for awareness, but planning actions remain gated by roster readiness.

---

## Minimal-Touch Requirements

- Single action per athlete row (Add/Remove).
- Immediate visual confirmation of inclusion state.
- No modal required for the basic action.
- No sidebar navigation; workflow header remains the only stage navigation.

---

## Role Boundary

This contract applies only to **attending context**.

Hosted meet configuration is a separate hat and follows separate contracts.

---

## Stability Note

This roster selection contract is locked before implementing Entries to minimize refactor risk and to ensure all downstream Build surfaces inherit the same coach mental model.

