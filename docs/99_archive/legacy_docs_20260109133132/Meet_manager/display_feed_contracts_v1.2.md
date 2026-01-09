# Meet Manager — Display Feed Contracts v1.2 (LOCKED)

**File:** `/docs/Meet_manager/display_feed_contracts_v1.2.md`
**Status:** Canonical (v1.2)

---

## 0) Purpose

Defines the read-only, real-time data contracts used to power:
- Stadium displays
- Venue scoreboards
- On-site kiosks
- Future broadcast overlays

Display feeds are **consumers only** and never mutate meet state.

---

## 1) Core Principles

1. **Read-Only**
   - No display feed may initiate state changes.
2. **Eventual Consistency**
   - Feeds reflect the latest PUBLISHED or FINAL state.
3. **Low-Latency, High-Frequency**
   - Optimized for frequent polling or push delivery.
4. **Idempotent Frames**
   - Each payload is self-sufficient.
5. **Channel Isolation**
   - Multiple displays may subscribe independently.

---

## 2) Feed Scope

All display feeds are scoped by:
- meet_id (required)
- channel_id (logical display instance)
- feed_type

No feed may cross meet boundaries.

---

## 3) Feed Types

### 3.1 MEET_OVERVIEW
- Current meet name, location, date
- Current lifecycle state
- Active event summary
- Next scheduled events

### 3.2 EVENT_LIVE
- Event metadata
- Live standings
- Attempts / splits in progress
- Provisional flags (if applicable)

### 3.3 EVENT_RESULTS
- Finalized or revised results
- Revision indicator
- Scoring summary

### 3.4 TEAM_SCORES
- Team rankings
- Points totals
- Tie indicators

### 3.5 ANNOUNCEMENTS
- Host-published messages
- Emergency notices
- Schedule adjustments

---

## 4) Publication Rules

Display feeds may consume only:
- PUBLISHED
- FINAL
- REVISED (latest)

Feeds must never surface:
- INGEST
- NORMALIZE
- VALIDATE
- PROVISIONAL

---

## 5) Update Semantics

- Feeds are updated on:
  - event state transition
  - results publication
  - revision publication
  - announcement creation
- No guarantee of ordering between feed types.

---

## 6) Delivery Mechanisms

### 6.1 Polling (v1.2 Baseline)
- GET endpoints
- Client-defined refresh interval

### 6.2 Push (Future)
- WebSockets or SSE
- Not required for v1.2

---

## 7) Authorization

- Display feeds require OPS_DISPLAY token (when enabled).
- Until OPS_DISPLAY rollout:
  - Feeds may be accessed via public-read endpoints
  - Read-only, no sensitive PII

---

## 8) Failure Handling

- Stale data acceptable if feed unreachable.
- Feed consumers must tolerate missing frames.
- No retries may cause upstream load spikes.

---

## 9) Security Constraints

- No athlete PII beyond name, team, mark/time.
- Tokens never embedded in static display URLs.
- HTTPS required.

---

## 10) Versioning

This display feed contract is **v1.2** and must remain consistent with:
- `canonical_spec_v1.2.md`
- `state_machines_v1.2.md`
- `routing_contracts_v1.2.md`
- `results_pipeline_contracts_v1.2.md`

Any change requires explicit governance promotion.
