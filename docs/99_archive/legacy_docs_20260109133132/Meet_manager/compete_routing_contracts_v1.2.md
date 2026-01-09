# Meet Manager — Compete Routing Contracts v1.2 (LOCKED)

**File:** `/docs/Meet_manager/compete_routing_contracts_v1.2.md`  
**Status:** LOCKED (additive; does not modify v1.2 canonical routing contracts)  
**Purpose:** Lock the “Compete” stage routing and page responsibilities before Meet Day Ops implementation.

---

## Workflow Header Contract

Meet Manager workflow header is authoritative navigation inside the Meet Manager context:

**Initiate → Build → Compete → Review**

- Current stage is backlit and non-selectable.
- Other stages are links.
- No sidebar navigation exists in Meet Manager surfaces (left rail is triage only).

---

## Compete Stage — Routing Topology

Compete is intentionally **two-step**:

1) **Program-scoped Compete landing** (selector / routing)
2) **Meet-scoped Ops workspace** (Meet Day Ops)

This matches coach cognition:
- Compete is a program workflow stage, but operations are meet-specific.

---

## Routes

### A) Compete Landing (Program-scoped selector)

**Route**
- `/programs/[programId]/meets/ops`

**Responsibilities**
- Select the meet to operate.
- Render a short list of meets relevant to the program (hosted + joined), with state badges:
  - planning / live / completed (exact enum values per v1.2 state machines)
- Route the coach into the meet-scoped ops workspace.

**Non-responsibilities**
- No stopwatches/timers running here.
- No results ingestion actions.
- No detailed ops tooling UI.

**Transitions**
- Selecting a meet routes to:
  - `/programs/[programId]/meets/[meetId]/ops`

---

### B) Meet Day Ops Workspace (Meet-scoped)

**Route**
- `/programs/[programId]/meets/[meetId]/ops`

**Responsibilities (v1.2 core spine only)**
- Operate meet day tooling for the selected meet:
  - timing/stopwatch functions (host + attendee, capability-gated)
  - results ingestion path (host-authoritative; mediated through ops tokens lifecycle)
  - live event state monitoring (Option A states on meet_events)

Authorization is constrained by:
- program membership (`program_members`)
- meet participation (`meet_participants`)
- host role (`meet_participants.role = HOST`) for privileged operations

**Non-responsibilities (deferred extensions)**
- heats/flights physical modeling
- field attempt-by-attempt tables
- display materialization tables (later rollout)
- scoring/ruleset abstractions beyond v1.2 contracts

---

## Role Symmetry Contract

Compete is shared for both:
- HOST program participants
- ATTENDING program participants

Routing does not fork by role.
Capabilities are gated by meet role + ops token lifecycle.

---

## Data Access Contract (Read)

Compete surfaces may read (via server actions) from core spine only:
- meets
- meet_participants
- meet_events
- meet_results (published-safe paths only unless host)

Compete must not assume extension tables exist.

