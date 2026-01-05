# Meet Manager — Server Action Boundaries v1.2 (LOCKED)

**File:** `/docs/Meet_manager/server_action_boundaries_v1.2.md`
**Status:** Canonical (v1.2)
**Scope:** Defines authoritative server actions, mutation ownership, and guard responsibilities for Meet Manager.

---

## 0) Principles

1. All state mutations occur via server actions or service-role API routes.
2. UI components never perform direct table writes.
3. Every action enforces:
   - role authorization
   - state machine validity
   - enum correctness
4. Reads may be broader than writes; writes are always minimal-scope.

---

## 1) Meet Lifecycle Actions

- `createMeet(program_id, payload)`
  - creates meet
  - sets lifecycle_state = draft

- `publishMeet(meet_id)`
  - guard: lifecycle_state = draft
  - sets lifecycle_state = published

- `completeMeet(meet_id)`
  - guard: lifecycle_state = published
  - sets lifecycle_state = completed

- `cancelMeet(meet_id)`
  - guard: lifecycle_state in (draft, published)
  - sets lifecycle_state = cancelled

Host only.

---

## 2) Participation Actions

- `inviteProgram(meet_id, program_id)`
- `requestJoinMeet(meet_id)`
- `approveJoinRequest(meet_id, program_id)`
- `rejectJoinRequest(meet_id, program_id)`
- `withdrawFromMeet(meet_id)`

Guards:
- transitions must match PARTICIPATION_STATUS state machine
- role: host for approvals, program for requests/withdrawals

---

## 3) Roster Actions

- `saveRosterDraft(meet_id, roster_payload)`
- `submitRoster(meet_id)`
- `lockRoster(meet_id)`
- `unlockRoster(meet_id)` (host override only)

Guards:
- SUBMISSION_STATUS transitions
- host override allowed only from locked → submitted

---

## 4) Entry Actions

- `saveEntriesDraft(meet_id, entries_payload)`
- `submitEntries(meet_id)`
- `lockEntries(meet_id)`
- `unlockEntries(meet_id)` (host override only)

Guards:
- SUBMISSION_STATUS transitions
- roster prerequisites enforced

---

## 5) Event Ops Actions (Host / Ops Tokens)

- `startEvent(meet_id, event_id)`
- `pauseEvent(meet_id, event_id)`
- `resumeEvent(meet_id, event_id)`
- `completeEvent(meet_id, event_id)`
- `reopenEvent(meet_id, event_id)`

Guards:
- event-type-specific state machines
- ops token scope if not host

---

## 6) Athlete Ops Actions

- `checkInAthlete(meet_id, athlete_id)`
- `undoCheckIn(meet_id, athlete_id)`
- `scratchAthlete(meet_id, athlete_id)`
- `undoScratch(meet_id, athlete_id)`

Guards:
- attendance / checkin / scratch state machines
- role: host or authorized ops token

---

## 7) Results Actions

- `ingestResult(event_id, payload)`
- `publishProvisionalResults(event_id)`
- `finalizeResults(event_id)`
- `reviseResults(event_id, payload)`

Guards:
- results pipeline stages
- append-only revisions
- publication gates enforced

---

## 8) Ops Token Actions

- `createOpsToken(meet_id, token_type, scope, expires_at)`
- `revokeOpsToken(token_id)`

Guards:
- host only
- scope validation

---

## 9) Read Actions (Non-Exhaustive)

- `getMeetHome(meet_id)`
- `getMeetRoster(meet_id)`
- `getMeetEntries(meet_id)`
- `getMeetEvents(meet_id)`
- `getLiveResults(meet_id)`
- `getDisplayFeed(meet_id, feed_type)`

Reads may aggregate across tables but never mutate state.

---

## 10) Versioning

This server action boundary contract is **v1.2** and must remain consistent with:
- `canonical_spec_v1.2.md`
- `state_machines_v1.2.md`
- `routing_contracts_v1.2.md`
- `supabase_schema_rls_v1.2.md`

Any changes require explicit governance promotion.
