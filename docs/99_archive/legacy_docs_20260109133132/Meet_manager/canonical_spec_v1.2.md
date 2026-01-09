# XC-Ecosystem — Meet Manager Module
## Canonical Specification v1.2 (LOCKED)

---

## 1. Purpose and Scope

The Meet Manager module provides end-to-end meet operations for Cross Country (XC) and Track & Field (T&F) within XC-Ecosystem.

The module is feature-complete by design. Payments are implemented last, but all contracts, states, and ownership for payments are defined from v1 to prevent refactors.

The module replaces external meet platforms by supporting:
- Meet discovery and selection
- Hosting and attending workflows
- Invitations, approvals, and participation management
- Team meet rosters
- Athlete entries
- Seeding, heats, flights, and scheduling
- Field event scoring
- Leg flags and operational readiness
- Timer console
- Live and official results
- Public live results
- Stadium display integration (later rollout, locked)
- Payments and reconciliation

---

## 2. Context Model (Binding)

Meet Manager always operates in one of two explicit contexts.

### 2.1 Hosting Context
A program owns and controls the meet.

Hosting authority includes:
- Meet creation and publication
- Visibility and join policy
- Invitations and approvals
- Meet structure (XC races / T&F events)
- Roster oversight
- Seeding and scheduling
- Field event scoring authorization
- Results validation and publication
- Stadium display configuration
- Payment rules and reconciliation

### 2.2 Attending Context
A program participates in a meet hosted by another program.

Attending authority includes:
- Meet discovery
- Join / request / accept invitation
- Team meet roster creation
- Athlete entries
- Scratches and check-in
- Viewing schedules, results, and exports
- Completing payments

Invariant: Hosts attend their own meet. Roster and entry tools are identical in both contexts.

---

## 3. Meet Types

### 3.1 Cross Country (XC)
- Race-based
- Distances and divisions define structure
- Team scoring is primary
- Individual times and placements are outputs

### 3.2 Track & Field (T&F)
- Event-based (track, field, relays)
- Athlete-event entries are primary
- Seeding, heats, and flights are mandatory
- Team scoring is derived from results

---

## 4. Visibility and Entry Policy

### 4.1 Visibility
- Open
- Invitational
- Private

### 4.2 Join Policy
- Auto-join
- Request approval
- Invite-only

---

## 5. Meet Discovery (Attending Context)

- Geographic radius slider (primary)
- Center point defaults to program home facility
- Filters for meet type, date range, and eligibility
- Sorting by soonest date then distance (default)

Eligibility requires published status, radius inclusion, and visibility compliance.

---

## 6. Meet Creation (Hosting Context)

- Draft → Published → Completed / Cancelled
- Core identity immutable after publish

### Date Conflict Indicator (Required)
Selecting a date triggers a check for other published meets on the same date within 100 miles, displaying a count and expandable list. Informational only.

---

## 7. Meet Participation (Core Object)

### States
- Invited
- Requested
- Approved
- Joined
- Rejected
- Withdrawn

Participation owns roster, entries, locks, payment state, and audit history.

---

## 8. Team Meet Roster

- Add/remove athletes
- Attendance states: Attending / Tentative / Not attending
- Check-in and scratch tracking
- Bib assignment (host-controlled)

Roster and entries are independent.

---

## 9. Entries

### XC
- Athletes assigned to races
- States: Entered / Scratched / DNS / DNF / Finished

### T&F
- Individual and relay entries
- Seed marks required
- Entry limits enforced

---

## 10. Seeding, Scheduling, and Operations

### XC
- Start lists
- Bibs
- Finish order
- Team scoring

### T&F
- Heats and flights
- Lane/order assignment
- Heat/field sheets

Day-of operations include check-in, scratches, results entry/import, and scoring updates.

---

## 11. Field Event Scoring (T&F)

- Scorer panels accessed via SMS or QR
- Attempt-by-attempt mark entry
- Automatic best-mark calculation
- Immediate propagation to results, scoring, public views, and displays
- Full audit and revisioning

---

## 12. Leg Flags System

- Flag worker panels via SMS/QR
- Event selector
- Large green (ready) / red (not ready) buttons
- Timestamped updates visible to director and timer console

---

## 13. Timer Console

- Event selector
- Leg readiness dashboard
- Check-in summary
- Scratch list
- Event status overview

Future timing-system ingestion is locked to this pipeline.

---

## 14. SMS + QR Ops Access

- Role- and assignment-scoped tokens
- Revocable, offline-tolerant, least-privilege
- Printable QR ops sheets and on-device display

---

## 15. Results, Scoring, and Publication

- Manual and imported results
- Versioned revisions
- Explicit scoring rules and tie handling
- Draft vs Official publication
- CSV/PDF/standard exports

---

## 16. Public Live Results

- No login required
- Live updates
- XC and T&F support
- Team scores and timestamps
- Enable/disable and live/official controls

---

## 17. Stadium Display Integration (Later Rollout, Locked)

- Live results
- Event/race status
- Upcoming schedule
- Sponsor advertising

Display channels define layout templates, playlists, and update frequency.
Supports web-based players and external signage bridges.

---

## 18. Payments (Implemented Last)

### Fee Models
- Per-team
- Per-athlete
- Per-event / relay
- Late fees
- Waivers

### States
- Unpaid
- Partial
- Paid
- Refunded
- Waived

Stripe-based reconciliation with audit linkage.

---

## 19. Permissions and Roles

### Host
- Meet Director
- Official
- Scorer
- Timer

### Attending
- Head Coach
- Assistant Coach
- View-only

All permissions are meet-scoped and auditable.

---

## 20. Audit and Integrity

All state changes are logged immutably, including invitations, roster and entry changes, scoring edits, flag updates, token actions, and payments.

---

## 21. UI Principles (Binding)

- Explicit context
- Predictable outcomes
- Reversible actions
- Minimal-touch, outdoor-safe interfaces
- Shared workflows across contexts

---

## 22. Explicit Non-Goals

- Long-term athlete ranking systems
- Spectator ticketing
- Programmatic ad bidding

---

## 23. Lock Statement

This document is canonical and binding.
All Meet Manager implementation must conform to v1.2.
Any change requires an explicit promotion and version increment.
