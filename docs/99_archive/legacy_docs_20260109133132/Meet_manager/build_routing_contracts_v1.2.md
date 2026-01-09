# Meet Manager — Build Routing Contracts v1.2 (LOCKED)

**File:** `/docs/Meet_manager/build_routing_contracts_v1.2.md`  
**Status:** LOCKED (additive; does not modify v1.2 canonical routing contracts)  
**Purpose:** Lock the “Build” stage routing and page responsibilities before UI implementation.

---

## Workflow Header Contract

Meet Manager workflow header is authoritative navigation inside the Meet Manager context:

**Initiate → Build → Compete → Review**

- Current stage is backlit and non-selectable.
- Other stages are links.
- No sidebar navigation exists in Meet Manager surfaces (left rail is triage only).

---

## Build Stage — Routing Topology

Build is intentionally **two-step**:

1) **Program-scoped Build landing** (selector / routing)
2) **Meet-scoped Build workspace** (Meet Builder)

This preserves coach workflow cognition:
- Build is a program workflow stage, but roster/entries are meet-specific.

---

## Routes

### A) Build Landing (Program-scoped selector)

**Route**
- `/programs/[programId]/meets/builder`

**Responsibilities**
- Select the meet to build against.
- Render a short list of meets relevant to the program (hosted + joined), with state badges.
- Route the coach into the meet-scoped builder.

**Non-responsibilities**
- No roster building UI on this page.
- No entry editing.
- No ops execution.
- No results review.

**Transitions**
- Selecting a meet routes to:
  - `/programs/[programId]/meets/[meetId]/builder`

---

### B) Meet Builder Workspace (Meet-scoped)

**Route**
- `/programs/[programId]/meets/[meetId]/builder`

**Responsibilities (v1.2 core spine only)**
- Build roster and entries for the selected meet.
- All mutations must be constrained to locked core spine tables:
  - `meet_rosters`
  - `meet_entries`
  - `meet_events` (host-authoritative edits only)
- Attending and hosting coaches share the same workspace route; capabilities differ by role and RLS.

**Non-responsibilities (deferred extensions)**
- heats/flights physical modeling
- field attempt-by-attempt scoring tables
- advanced scoring rulesets abstractions
- display materialization tables

---

## Role Symmetry Contract

Build is a shared workflow stage for both:
- HOST program participants
- ATTENDING program participants

Routing does not fork by role.
Authorization and capability gating is determined by:
- program membership (`program_members`)
- meet participation (`meet_participants`)
- host role (`meet_participants.role = HOST`)

---

## Data Access Contract (Read)

Build surfaces may read (via server actions) from core spine only:
- meets
- meet_participants
- meet_rosters
- meet_entries
- meet_events

Build must not assume extension tables exist.

