# Meet Manager — Build Entries UX Contract (Attending) v1.2 (LOCKED)

**File:** `/docs/Meet_manager/build_entries_ux_contract_attending_v1.2.md`  
**Status:** LOCKED  
**Scope:** Build phase (Attending meet context only)

---

## Purpose

Lock the coach-facing UX meaning and gating behavior for **Entries** in the Build phase
when operating in **attending context**.

This contract defines what “Entries” represents, how it relates to the roster,
and when Entries is considered complete enough to proceed to Compete.

---

## Preconditions

Entries is only accessible when:
- an **attending meet** is selected in the Build header, and
- the **roster contains at least one athlete**

Roster selection is a hard prerequisite.

---

## Core Coach Question

Once the roster is set, Entries answers:

**“What events is each attending athlete entered in for this meet?”**

Entries are an explicit planning decision, not an inference.

---

## Conceptual Model

- Entries are **athlete → event assignments**
- An athlete may be entered in:
  - zero events (temporarily allowed)
  - one or more events (subject to later rules)
- An event may have:
  - zero athletes entered (temporarily allowed)
  - one or more athletes entered

Completeness is evaluated at the **meet level**, not per-athlete.

---

## UI Surface Definition

### Entries Surface (Secondary, After Roster)

- Display roster athletes as the primary axis.
- Allow the coach to assign events to each athlete.
- The exact UI (table, grid, cards) is implementation-defined, but must:
  - make athlete participation explicit
  - avoid hidden or inferred entries

---

## Action Semantics

### Add Entry
- Means: “This athlete is intended to compete in this event.”
- Creates or updates a `meet_entries` record linking:
  - `(meet_id, program_id, athlete_id, event_id)`

### Remove Entry
- Means: “This athlete is not competing in this event.”
- Removes the corresponding `meet_entries` record.

---

## Draft vs Ready State

- Entries are **draft by default**.
- Partial entries are allowed during Build.
- Entries are considered **ready for Compete** when:
  - at least one entry exists for the meet **or**
  - the coach explicitly acknowledges no entries (edge case)

The exact “ready” marker may be implemented later, but gating must exist.

---

## Gating Rules

### Entries → Compete
- Compete (meet day ops) must not be entered unless:
  - a meet is selected
  - roster exists
  - Entries are in a non-empty or acknowledged-ready state

### Entries → Review
- Review may show incomplete or draft entries for audit purposes.

---

## Explicit Deferrals (v1.2)

The following are intentionally out of scope:
- Entry limits per athlete
- Event caps
- Qualification standards
- Relay leg ordering
- Seeding, heats, or flights
- Scoring implications

These will be layered later without changing core semantics.

---

## Role Boundary

This contract applies only to **attending context**.

Hosted meet event configuration and validation follow separate contracts.

---

## Stability Note

This Entries UX contract is locked prior to implementation to:
- preserve coach mental flow
- minimize downstream refactor risk
- ensure Compete logic inherits a stable planning model

