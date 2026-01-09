# Meet Manager — Compete UX Contracts v1.2 (LOCKED)

**File:** `/docs/Meet_manager/compete_ux_contracts_v1.2.md`  
**Status:** LOCKED  
**Scope:** Compete phase (Hosted and Attending contexts)

---

## Purpose

Lock the coach-facing UX meaning, authority boundaries, and gating rules for the
**Compete** phase of Meet Manager.

Compete represents **meet-day execution**, not planning.

---

## Entry Preconditions (All Roles)

Compete is accessible only when:
- a meet is selected, and
- Build phase prerequisites are satisfied for the given role.

Build artifacts are inputs; Compete does not alter Build intent.

---

## Role Separation (Non-negotiable)

Compete operates under **explicit role context**:
- **HOST**
- **ATTENDEE**

Roles are selected via the workflow header and must never be inferred.

---

## Core Coach Questions

### Hosted Compete
**“How do we run this meet, right now?”**

### Attending Compete
**“How is this meet unfolding for my athletes?”**

---

## Hosted Compete UX Contract

### Authority

Host has exclusive authority to:
- start / advance / close events
- control official event state transitions
- enter, revise, and publish results
- manage live operational corrections

Attendees must never see host controls.

---

### Hosted Surfaces (v1.2)

1) **Event Execution Surface (Primary)**
   - One event at a time is “active”
   - Event state is explicit (per canonical state machines)
   - Host controls state transitions only

2) **Results Entry & Revision**
   - Results are entered against an active or completed event
   - Results are append-only revisions
   - Revision number increases monotonically
   - Publication is an explicit host action

3) **Operational Tools**
   - Stopwatch / timing (track & XC)
   - Field scoring stubs
   - Ops token–based authorization for delegated input

---

### Hosted Gating Rules

- Host Compete must not start unless:
  - hosted Build configuration is in an acceptable state
  - event slate exists
- Results publication must be gated behind:
  - event completion state
  - explicit host confirmation

---

## Attending Compete UX Contract

### Authority

Attending coaches:
- **do not control** event state
- **do not enter official results**
- **do not publish results**

They observe and respond.

---

### Attending Surfaces (v1.2)

1) **Live Event View (Primary)**
   - Current event state
   - Start lists / entry lists
   - Live or provisional result feed (if exposed)

2) **My Athletes View**
   - Athlete-centric view of:
     - entered events
     - current status
     - posted results

3) **Notifications / Alerts**
   - Event start notices
   - Result availability
   - Schedule changes

---

### Attending Gating Rules

- Attending Compete is accessible only if:
  - the program has rostered athletes
  - Entries exist or were explicitly acknowledged as empty
- Attending coaches cannot act until host publishes data.

---

## Results Visibility Rules

- Provisional results:
  - visible only to host
- Published results:
  - visible to attendees and public read surfaces
- Attending coaches must never see unpublished revisions.

---

## Relationship to Review

- Compete produces immutable artifacts:
  - results revisions
  - audit logs
- Review consumes Compete output and is read-only.

---

## Explicit Deferrals (v1.2)

- Multi-venue simultaneous events
- Advanced conflict resolution UI
- Protest / appeal workflows
- Automated scoring and placings
- Media synchronization

---

## Minimal-Touch Requirements

- Compete UI must prioritize:
  - current event
  - immediate athlete relevance
- No sidebar navigation; workflow header persists.
- All destructive or state-advancing actions must be explicit and reversible where possible.

---

## Stability Note

Compete UX is locked before implementation to:
- preserve role safety
- enforce operational correctness
- prevent irreversible schema or UI coupling errors

