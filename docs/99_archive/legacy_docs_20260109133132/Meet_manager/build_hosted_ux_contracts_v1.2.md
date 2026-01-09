# Meet Manager — Build (Hosted) UX Contracts v1.2 (LOCKED)

**File:** `/docs/Meet_manager/build_hosted_ux_contracts_v1.2.md`  
**Status:** LOCKED  
**Scope:** Build phase (Hosted meet context only)

---

## Purpose

Lock the coach-facing UX meaning and authority boundaries for the Build phase
when operating in **HOST context**.

This contract defines:
- what “building a hosted meet” means
- what surfaces are host-authoritative
- how the coach switches hats to plan their own roster/entries

---

## Entry & Context

Build is a **single continuous surface** (`/programs/[programId]/meets/builder`)
with meet selection inside the header.

This contract applies when:
- the coach selects a meet in the **Hosted Meets** dropdown
- the Build surface enters **host context**

---

## Core Coach Question (Host Context)

When hosting context is selected, the first question Build answers is:

**“What are we running, and what are the rules/structure of the meet?”**

Host context is about meet configuration and meet-wide correctness,
not about a single team’s participation.

---

## Authority Boundaries (Non-negotiable)

### Host-authoritative actions are confined to:
- **meet-wide configuration**
- meet-wide event publishing/updates
- meet-wide operational readiness surfaces

### Host context must NOT silently include:
- the host program’s roster/entries planning
- any “my team” planning decisions

Rationale: Host and attendee are different hats. The UI must force explicit selection.

---

## Hat-Switch Rule (Hosted ↔ Attending)

For every hosted meet, there exists a corresponding attending context for the same program.

- To plan the host program’s roster and entries, the coach must switch to:
  - **Attending Meets dropdown**
  - selecting the corresponding attending context

The UI must not:
- auto-switch roles
- merge host configuration and attendee roster/entries into one context
- infer “my roster” while in host context

---

## Hosted Build Surface Areas (v1.2)

Hosted Build is composed of three conceptual areas.

### 1) Meet Configuration (Primary)
Host sets meet identity and configuration:
- meet metadata (name/title if present, date/time windows, venue/location)
- participation constraints (invitational/open status if present)
- publish readiness indicators

**Note:** exact fields are defined by canonical spec and schema; UI is contractually host-owned.

### 2) Events (Primary)
Host defines the event slate and event lifecycle:
- create/update meet events
- event scheduling windows
- event type correctness (XC/TF/FIELD)
- **Option A state columns** enforcement is assumed

Events are meet-wide and must be host-controlled.

### 3) Host Updates (Secondary)
Host can post changes that affect attendees:
- schedule updates
- event slate changes
- operational notices

This surface is informational in v1.2 unless/ until a formal updates subsystem is introduced.

---

## Hosted Gating Rules

### Hosted selection → configuration visibility
- Host configuration surfaces appear only after a hosted meet is selected.

### Hosted configuration → Compete
- Compete host operations must remain gated until host configuration is in an acceptable state.
- The definition of “acceptable state” is a Compete contract concern, but Build must surface readiness indicators.

---

## Explicit Deferrals (v1.2)

Hosted Build explicitly defers:
- complex ruleset abstraction / multi-ruleset scoring
- heats/flights modeling and lane assignments
- field attempt-by-attempt scoring tables
- public display materialization tables
- full public payload shaping beyond basic contracts

---

## Minimal-Touch Requirements

- No sidebar navigation; workflow header is the only stage navigation.
- Host context must clearly display:
  - the selected meet
  - host role
  - the fact that roster/entries require switching to attending context

---

## Stability Note

Hosted Build is locked at the UX contract level before implementation to preserve:
- role clarity
- authority safety
- minimal refactor risk when host operations expand

