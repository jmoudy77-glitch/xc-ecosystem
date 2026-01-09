# Meet Manager — Review UX Contracts v1.2 (LOCKED)

**File:** `/docs/Meet_manager/review_ux_contracts_v1.2.md`  
**Status:** LOCKED  
**Scope:** Review phase (Hosted and Attending contexts)

---

## Purpose

Lock the coach-facing UX meaning, authority boundaries, and visibility rules for
the **Review** phase of Meet Manager.

Review represents **post-meet analysis and archival consumption**.
It does not execute the meet and does not modify official results.

---

## Role Separation

Review operates under explicit role context:
- **HOST**
- **ATTENDEE**

Role context affects which administrative artifacts are visible, but does not grant mutation authority.

---

## Core Coach Questions

### Host Review
**“What happened overall, and are the official artifacts complete and publish-correct?”**

### Attendee Review
**“How did my athletes perform, and what should I take forward?”**

---

## Authority Boundaries (Non-negotiable)

Review is read-only for both roles with respect to core meet artifacts:
- meet events
- entries
- results

No state transitions occur in Review.
No results revisions are created in Review.

Any correction workflow remains in Compete (host) via append-only revisions.

---

## Results Visibility Rules

Review must adhere to publication gating:

- **Attendees** may view only results in publication states:
  - `published`, `final`, `revised`
- **Hosts** may view:
  - published artifacts as above
  - and may also view provisional revisions for operational audit, if present

Public read surfaces (outside authenticated Review) are out-of-scope here and follow public view contracts.

---

## Review Surfaces (v1.2)

### 1) Event Results (Primary)
- List events
- For each event:
  - show final/published/revised results
  - indicate revision status where applicable

### 2) Athlete-Centric Summary (Primary for Attendee)
- “My Athletes” view:
  - athlete entries
  - athlete results
  - optional notes (deferred)

### 3) Program Recap (Secondary)
- Program-level aggregation:
  - participation counts
  - completed events
  - simple highlights (deferred)

---

## Hosted Review Additions (v1.2)

Host Review may include:
- basic audit visibility into revision lineage (read-only)
- confirmation that published artifacts exist for completed events

Explicitly deferred:
- protest/appeals workflows
- scoring finalization pipelines
- automated ranking / points computation

---

## Gating & Navigation

- Review is accessible when a meet exists (historical or completed).
- Review does not require the meet to be “live.”
- Workflow header persists; no sidebar navigation.

---

## Minimal-Touch Requirements

- Review defaults to a clean read-only layout:
  - clear “what happened” at a glance
  - drill-down per event and per athlete
- No destructive actions.
- Any links to “correct results” must route to Compete host workflows.

---

## Stability Note

Review UX is locked prior to implementation to:
- preserve trust and audit integrity
- enforce publication gating
- minimize refactors as results pipelines expand

