
# Meet Manager — Routing Contracts v1.2 (LOCKED)

**File:** `/docs/Meet_manager/routing_contracts_v1.2.md`
**Status:** Canonical (v1.2)
**Scope:** Web app routes (Next.js App Router), API routes/server-actions boundaries, and public/display surfaces. Payments routes are defined but **must remain non-executed until the Payments phase**.

---

## 0) Routing Tenets

1. **Single Meet Surface, Contextualized**

   * The same Meet Manager surface renders **HOSTING** vs **ATTENDING** context based on the user’s relationship to the meet (`meet_participants.role`), not on separate route families.

2. **Stable URLs, Deterministic State Guards**

   * Routes do not encode transient state in path params.
   * State transitions occur through **explicit actions** (server actions / API POST) with deterministic guards (per `state_machines_v1.2.md`).

3. **Coach-Oriented Navigation**

   * Keep a small set of predictable “locations”:

     * Discovery
     * Meet Home
     * Roster
     * Entries
     * Seeding (host)
     * Ops (host)
     * Live Results (public + authenticated)
     * Display (later rollout, locked)

4. **Public vs Authenticated Separation**

   * Public URLs never require authentication.
   * Authenticated coach routes live under program context: `/programs/[programId]/…`

---

## 1) Route Families

### 1.1 Coach App (Authenticated)

Primary base:

* `/programs/[programId]/meets`

All coach operations occur here, including hosting and attending.

### 1.2 Public Live Results (Unauthenticated)

Primary base:

* `/meets/[meetId]/live`

Optimized for spectators; no coach mutation.

### 1.3 Display Channels (Locked for later rollout)

Primary base:

* `/display/meets/[meetId]/…`

Architecturally reserved; no functional dependency in v1.2 implementation.

---

## 2) Coach App Routes (Next.js App Router)

### 2.1 Meet Discovery + Selection

* **GET** `/programs/[programId]/meets`

  * Default view: discovery panel + “My Meets”
  * Includes radius filter + date quick filters

* **GET** `/programs/[programId]/meets/discover`

  * Optional dedicated discover route if needed for UI segmentation

* **GET** `/programs/[programId]/meets/[meetId]`

  * Meet Home (contextual: hosting vs attending)
  * Shows state, key deadlines, roster/entries status, ops links if host

### 2.2 Hosting: Create Meet

* **GET** `/programs/[programId]/meets/create`

  * Meet creation form
  * Includes date conflict indicator (100-mile radius)

* **POST** handled via server action (recommended) or API route:

  * `createMeet(programId, payload) -> meetId`

### 2.3 Participation: Join Meet / Invitation Handling

* **GET** `/programs/[programId]/meets/[meetId]/join`

  * Join confirmation + context (open vs invitational)
  * If invitational: invitation token input/verification UI

* **POST** join handled via server action/API:

  * `joinMeet(programId, meetId, token?)`

### 2.4 Team Roster (Both Contexts)

* **GET** `/programs/[programId]/meets/[meetId]/roster`

  * Team roster builder for this meet
  * Roster lock status visible

### 2.5 Athlete Entries (Both Contexts)

* **GET** `/programs/[programId]/meets/[meetId]/entries`

  * Athlete entries creation/editing
  * Entry lock status visible

### 2.6 Hosting: Seeding / Heats / Flights

* **GET** `/programs/[programId]/meets/[meetId]/seeding`

  * Seeding console (heats/flights generation + adjustments)
  * Only available to HOST role; guarded by meet lifecycle state

### 2.7 Hosting: Ops Console

* **GET** `/programs/[programId]/meets/[meetId]/ops`

  * Host operational control surface:

    * check-in, scratches
    * event start/stop controls (per event type)
    * leg flags control plane
    * field scoring (SMS + QR)
    * results revision workflow (host)

### 2.8 Timer Console (Host + Authorized Staff)

* **GET** `/programs/[programId]/meets/[meetId]/timer`

  * Timer console
  * Supports XC and track running events
  * Uses ops tokens / scoped permissions (see future “ops token lifecycle” doc)

---

## 3) Public Routes (Unauthenticated)

### 3.1 Public Live Results

* **GET** `/meets/[meetId]/live`

  * Public live results hub (XC + T&F)
  * Read-only: standings, event results, progress indicators, next events

* **GET** `/meets/[meetId]/live/xc`

  * Optional dedicated XC surface

* **GET** `/meets/[meetId]/live/tf`

  * Optional dedicated T&F surface

### 3.2 Public Field Event Scoring Access (QR)

* **GET** `/meets/[meetId]/field/[eventId]/score`

  * QR entry point for field event scoring
  * Requires a **scoring access token** (short-lived, event-scoped) via query param
  * If token missing/invalid: show “Access expired / request new QR” screen

---

## 4) Reserved Display Routes (Locked)

* **GET** `/display/meets/[meetId]`
* **GET** `/display/meets/[meetId]/stadium`
* **GET** `/display/meets/[meetId]/boards/[boardId]`

**Lock:** No v1.2 features may depend on these routes. They exist as future rollout surfaces only.

---

## 5) API Contract Surface (Preferred Boundaries)

### 5.1 Preference Order

1. **Server Actions** for authenticated coach mutations (best for App Router).
2. **Route Handlers** (`/app/api/...`) where:

   * tokenized public access is required (QR scoring, public live feeds)
   * external integrations require HTTP endpoints
   * polling or streaming endpoints are needed

### 5.2 Canonical API Route Names (v1.2)

**Authenticated (coach)**

* `POST /api/meets/create`
* `POST /api/meets/join`
* `POST /api/meets/[meetId]/roster/submit`
* `POST /api/meets/[meetId]/entries/submit`
* `POST /api/meets/[meetId]/entries/lock`
* `POST /api/meets/[meetId]/seeding/generate`
* `POST /api/meets/[meetId]/ops/event/start`
* `POST /api/meets/[meetId]/ops/event/stop`
* `POST /api/meets/[meetId]/ops/checkin`
* `POST /api/meets/[meetId]/ops/scratch`
* `POST /api/meets/[meetId]/ops/results/revise`
* `POST /api/meets/[meetId]/ops/leg_flags/set`

**Public / Tokenized**

* `GET  /api/public/meets/[meetId]/live`
* `GET  /api/public/meets/[meetId]/live/xc`
* `GET  /api/public/meets/[meetId]/live/tf`
* `POST /api/public/meets/[meetId]/field/[eventId]/score` (token required)
* `GET  /api/public/meets/[meetId]/field/[eventId]/score_state` (token required)

**Note:** Exact internal implementation may use RPC calls and/or Supabase Edge Functions later; these are the canonical HTTP “shapes.”

---

## 6) Authorization Matrix by Route

| Route                                          | Auth | Required Role             | Notes                           |
| ---------------------------------------------- | ---: | ------------------------- | ------------------------------- |
| `/programs/[programId]/meets`                  |  Yes | coach (program member)    | Discovery + My Meets            |
| `/programs/[programId]/meets/create`           |  Yes | coach (program member)    | Host meet creation              |
| `/programs/[programId]/meets/[meetId]`         |  Yes | participant               | Contextual home                 |
| `/programs/[programId]/meets/[meetId]/join`    |  Yes | coach (program member)    | Creates participant record      |
| `/programs/[programId]/meets/[meetId]/roster`  |  Yes | attendee or host          | Team-specific                   |
| `/programs/[programId]/meets/[meetId]/entries` |  Yes | attendee or host          | Team-specific                   |
| `/programs/[programId]/meets/[meetId]/seeding` |  Yes | host                      | Host-only                       |
| `/programs/[programId]/meets/[meetId]/ops`     |  Yes | host (or delegated ops)   | Delegation via ops tokens later |
| `/programs/[programId]/meets/[meetId]/timer`   |  Yes | host (or delegated timer) | Delegation via ops tokens later |
| `/meets/[meetId]/live`                         |   No | n/a                       | Public                          |
| `/meets/[meetId]/field/[eventId]/score`        |   No | token                     | Tokenized scoring               |

---

## 7) State Guard Requirements (Route-Level)

Each route must enforce the **minimum state** required to be meaningful:

* **Roster route** requires meet participation exists; roster may be **editable** or **locked** per roster state machine.
* **Entries route** requires roster meets prerequisites; entries may be **editable** or **locked** per entries state machine.
* **Seeding route** requires host role and meet lifecycle state that permits seeding actions.
* **Ops route** requires host (or delegated) and meet lifecycle state that permits starting events and recording results.
* **Timer route** requires host (or delegated) and event readiness state permitting timing operations.

Guards must be **hard** (block mutations) and **soft** (UI indicates why disabled).

---

## 8) Canonical “Deep-Link” Set (Minimal-Touch)

These are the only deep links that must be considered “first-class” for coach workflows:

1. Meet Home: `/programs/[programId]/meets/[meetId]`
2. Roster: `/programs/[programId]/meets/[meetId]/roster`
3. Entries: `/programs/[programId]/meets/[meetId]/entries`
4. Host Ops: `/programs/[programId]/meets/[meetId]/ops`
5. Host Seeding: `/programs/[programId]/meets/[meetId]/seeding`
6. Host Timer: `/programs/[programId]/meets/[meetId]/timer`
7. Public Live: `/meets/[meetId]/live`

---

## 9) Payments Routing (Architecturally Defined, Execution Deferred)

**Routes reserved (do not implement until payments phase):**

* `/programs/[programId]/meets/[meetId]/billing`
* `/api/meets/[meetId]/billing/checkout`
* `/api/meets/[meetId]/billing/webhook` (or centralized webhook)

**Lock:** Meet operations cannot depend on payment checks until the payments component is tackled last.

---

## 10) Versioning

* This routing contract is **v1.2** and must remain consistent with:

  * `canonical_spec_v1.2.md`
  * `state_machines_v1.2.md`

Any changes require a version bump and explicit governance action.
