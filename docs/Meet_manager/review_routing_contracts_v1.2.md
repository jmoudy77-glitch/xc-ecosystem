# Meet Manager — Review Routing Contracts v1.2 (LOCKED)

**File:** `/docs/Meet_manager/review_routing_contracts_v1.2.md`  
**Status:** LOCKED (additive; does not modify v1.2 canonical routing contracts)  
**Purpose:** Lock the “Review” stage routing and page responsibilities before Results & Archive implementation.

---

## Workflow Header Contract

Meet Manager workflow header is authoritative navigation inside the Meet Manager context:

**Initiate → Build → Compete → Review**

- Current stage is backlit and non-selectable.
- Other stages are links.
- No sidebar navigation exists in Meet Manager surfaces (left rail is triage only).

---

## Review Stage — Routing Topology

Review is intentionally **two-step**:

1) **Program-scoped Review landing** (selector / routing)
2) **Meet-scoped Review workspace** (results + archive for the selected meet)

This matches cognition:
- Review is a program workflow stage, but results are meet-specific.

---

## Routes

### A) Review Landing (Program-scoped selector)

**Route**
- `/programs/[programId]/meets/review`

**Responsibilities**
- Select a completed/archived meet to review.
- Render a list of meets relevant to the program (hosted + joined), with completion indicators.
- Route the coach into meet-scoped review.

**Non-responsibilities**
- No results ingestion actions.
- No ops tooling.
- No roster planning.
- No public “live” browsing (that belongs to public views/endpoints).

**Transitions**
- Selecting a meet routes to:
  - `/programs/[programId]/meets/[meetId]/review`

---

### B) Meet Review Workspace (Meet-scoped)

**Route**
- `/programs/[programId]/meets/[meetId]/review`

**Responsibilities**
- Review results and archival data for the meet.
- Default to published-safe results views for non-host participants.
- Host programs may review additional internal states if/when surfaced (still constrained by locked schema + RLS).

**Data sources**
- Must respect results pipeline contracts (v1.2) and publication gating.
- Public-safe results are available via views:
  - `public.public_event_results` (latest revision; published/final/revised only)
- Authenticated review may read core spine tables per RLS:
  - `meet_results` for meet participants (host has additional write/ingest capabilities elsewhere)

**Non-responsibilities (deferred extensions)**
- scoring/ruleset abstractions beyond v1.2
- display materialization
- per-attempt field scoring detail tables

---

## Role Symmetry Contract

Review is shared for both:
- HOST program participants
- ATTENDING program participants

Routing does not fork by role.
Visibility is gated by:
- meet participation (`meet_participants`)
- publication state gating (published/final/revised)

---

## Public vs Authenticated Boundary

- Review stage is an authenticated coach surface.
- Public browsing is served via public routes/views (separate from workflow header), and must never expose provisional results.

