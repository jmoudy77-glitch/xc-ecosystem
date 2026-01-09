# Discovery Portal — UI Contract (LOCKED)

This document defines the **canonical layout and structural contract** for the
Recruiting Discovery Portal. Any implementation, refactor, or extension MUST
comply with this contract unless superseded by a promoted revision.

---

## Context

- The Discovery Portal is launched from Recruiting Stabilization.
- It is rendered as a **modal**, not a route.
- It is **self-contained** and does not mutate Stabilization directly.
- Discovery feeds **Favorites only**, on modal close.

---

## Modal Container

- Full-screen overlay modal.
- Visually dominant, page-like (intended for focused work).
- Underlying Stabilization UI is inert while open.

---

## Internal Layout (LOCKED)

The modal is divided into **four panels** with fixed proportional sizing.

### 1. Favorites Panel
- **Width:** 30%
- **Height:** 100%
- **Alignment:** Right edge of modal
- **Purpose:**
  - Discovery-local shortlist
  - Staging area for athletes to be exported to Stabilization
- **Notes:**
  - This is NOT the Stabilization Favorites panel
  - No slot context is shown here

---

### 2. Athlete Profile Panel
- **Width:** 40%
- **Height:** 80%
- **Alignment:** Immediately left of Favorites panel
- **Purpose:**
  - Detailed inspection of the currently selected athlete
  - Purely informational; no slot actions
- **Behavior:**
  - Populates only when an athlete is selected from Results
  - Empty state when no athlete is selected

---

### 3. Surfaced Results Panel
- **Width:** 30%
- **Height:** 80%
- **Alignment:** Left of Athlete Profile panel
- **Purpose:**
  - Displays search/filter results
- **Behavior:**
  - Empty on modal open
  - Populates ONLY after explicit search/filter action

---

### 4. Filter / Search Panel
- **Width:** 70%
- **Height:** 20%
- **Alignment:** Top, spanning above Results + Profile panels
- **Purpose:**
  - Defines Discovery query scope
  - The sole driver of Results population

---

## Explicit Non-Features (LOCKED)

- No Stabilization panels inside Discovery
- No slot visuals
- No drag-and-drop into Surfaced
- No auto-populated results
- No persistence to Stabilization until modal close
- No engine-fed lists on open

---

## Export Boundary

- On modal close:
  - Discovery Favorites are handed off to Stabilization Favorites
- No other state crosses this boundary

---

## Contract Status

**LOCKED — v1**

Any change to:
- panel count,
- relative sizing,
- behavioral responsibility,
- or export semantics

requires a new promoted contract revision.

---
