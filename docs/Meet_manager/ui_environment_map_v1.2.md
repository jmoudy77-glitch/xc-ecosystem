# Meet Manager — UI Environment Map v1.2 (LOCKED)

**File:** `/docs/Meet_manager/ui_environment_map_v1.2.md`  
**Status:** Canonical (v1.2)  
**Scope:** Defines the authoritative UI environments for the Meet Manager module, mapped to roles, routes, and shared capabilities.

---

## 0) Governing Principles

1. UI environments are organized by **coach intent**, not by database structure.
2. Hosting is treated as **attending + additional authority**, never as a separate team workflow.
3. Shared team-facing capabilities must not fork logic between host and attendee.
4. Live operations surfaces prioritize **state visibility, minimal-touch, and error avoidance**.

---

## 1) Canonical UI Environments

### 1.1 Meet Landing / Discovery

**Purpose**
- Discover, evaluate, host, or join meets.

**Primary Route**
- `/programs/[programId]/meets`

**Applies To**
- All coaches (pre-participation and active participants)

---

### 1.2 Meet Builder — Hosting (Meet Definition)

**Purpose**
- Define and publish the meet as a system.

**Primary Routes**
- `/programs/[programId]/meets/create`
- `/programs/[programId]/meets/[meetId]` (host context)
- Optional subroutes:
  - `/settings`
  - `/participants`
  - `/schedule`

**Applies To**
- Host program only

---

### 1.3 Team Console (Shared: Host + Attendee)

**LOCKED DESIGNATION:** Shared environment

**Purpose**
- Prepare and manage a program’s athletes for a specific meet.

**Includes**
- Team meet roster
- Athlete attendance / availability
- Event entries
- Team check-in status
- Team-scoped live results

**Primary Routes**
- `/programs/[programId]/meets/[meetId]/roster`
- `/programs/[programId]/meets/[meetId]/entries`

**Applies To**
- All participating programs, including host program

**Data Scope**
- Always `meet_id + program_id`
- No host-specific logic branches permitted

---

### 1.4 Team Ops Console (Shared, Live)

**LOCKED DESIGNATION:** Shared environment

**Purpose**
- Live meet-day interaction for a single program.

**Includes**
- Team athlete status (checked-in, scratched, competing)
- Live team-filtered results
- **Stopwatch / timing console (shared with Practice engine)**

**Primary Route**
- `/programs/[programId]/meets/[meetId]/team-ops`

**Applies To**
- Host and attending programs
- Mutations gated by role and event state

---

### 1.5 Host Ops Console (Global)

**Purpose**
- Run the meet as a global system.

**Includes**
- Global check-in and scratch controls
- Seeding, heats, flights
- Event start/stop authority
- Ops token issuance and revocation
- Results publication and revision

**Primary Routes**
- `/programs/[programId]/meets/[meetId]/ops`
- `/programs/[programId]/meets/[meetId]/seeding`
- `/programs/[programId]/meets/[meetId]/timer`

**Applies To**
- Host program and delegated ops roles only

---

### 1.6 Results & Review

**Purpose**
- Post-meet analysis and official record.

**Primary Routes**
- `/programs/[programId]/meets/[meetId]/results`
- `/programs/[programId]/meets/[meetId]/results/revisions`

**Applies To**
- All participating programs (read)
- Host retains revision authority

---

### 1.7 Public / External View

**Purpose**
- Spectator-facing and scoring access.

**Primary Routes**
- `/meets/[meetId]/live`
- `/meets/[meetId]/field/[eventId]/score`

**Applies To**
- Unauthenticated users
- Tokenized scorers

---

### 1.8 Administration & Governance (Host Only)

**Purpose**
- Low-frequency, high-impact controls and audit.

**Primary Routes**
- `/programs/[programId]/meets/[meetId]/admin/tokens`
- `/programs/[programId]/meets/[meetId]/admin/audit`

---

## 2) Stopwatch / Timing Engine Reuse (LOCKED)

### 2.1 Shared Engine

The Meet Manager **must reuse** the Practice stopwatch engine for:
- Multi-athlete timing
- Individual and group starts
- Lap capture
- Active-clock persistence
- Split table rendering

### 2.2 Meet-Specific Constraints

Meet usage adds:
- Binding to `meet_id + event_id`
- Event state guards (cannot start unless event is ready)
- Persistence only on event stop / completion
- Results ingestion via results pipeline contracts

### 2.3 Route Binding

- Stopwatch UI lives at:
  - `/programs/[programId]/meets/[meetId]/timer`
- Team-scoped access may be surfaced via:
  - `/programs/[programId]/meets/[meetId]/team-ops`

---

## 3) Navigation Spine Rule

**Meet Home** (`/programs/[programId]/meets/[meetId]`) is the sole context router.

It must:
- Resolve role (host vs attendee)
- Present only environment-appropriate entry points
- Never mix builder, team ops, and host ops controls on the same screen

---

## 4) Versioning

This UI environment map is **v1.2** and must remain consistent with:
- `canonical_spec_v1.2.md`
- `routing_contracts_v1.2.md`
- `state_machines_v1.2.md`
- `server_action_boundaries_v1.2.md`

Any changes require explicit governance promotion.
