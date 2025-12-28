# Meet Structure Technical Specification

This document defines the canonical data model for track & field and cross-country meets
hosted within XC‑Ecosystem. It covers meets, sessions, events, entries, heats/flights,
and result output.

## 1. Overview

A meet consists of:
- One or more *sessions*
- Each session hosts one or more *events*
- Each event may require heats or flights
- Athletes/teams enter each event via *entries*
- Performances are collected into official *results*

Our object model follows:

`meet → session → event-instance → entry → performance`

This is compatible with track, XC, and field events.

---

## 2. Meet Object (planned table: meets)

### Fields
- `id`
- `host_program_id`
- `name`
- `location`, `facility`
- `level` (HS, college, club)
- `start_date`, `end_date`
- `created_by`, timestamps

### Behavior
- Creating a meet scaffolds empty sessions and allows adding events.
- Governs permissions: only host program staff can configure.

---

## 3. Sessions (planned table: meet_sessions)

Sessions represent blocks like “Friday PM”.

### Fields
- `id`
- `meet_id`
- `label`
- `start_time`, `end_time`

### Notes
- Sessions group events and determine ordering.

---

## 4. Events (planned table: results_events)

An *event instance* within a meet, e.g. “Men’s 1500m Final”.

### Fields
- `id`
- `session_id`
- `event_code`
- `gender`
- `round` (prelims/finals)
- `order_index`
- `config_json` (flight sizes, heat rules)

### Notes
- Uses Universal Event Model via `event_code`.

---

## 5. Entries (planned table: results_entries)

Represents a team/athlete entering an event instance.

### Fields
- `id`
- `event_id`
- `team_id` (optional for XC)
- `athlete_id`
- `seed_mark`
- `lane_assignment`
- `flight_assignment`
- `scratch` (boolean)

---

## 6. Heats / Flights

Heats for track, flights for field events.

### Stored in
- `results_events.config_json` for automatic generation
- `results_entries` for lane/flight metadata

### Algorithm
- Sort entries by seed mark
- Allocate lanes evenly based on meet configuration
- Allow manual overrides

---

## 7. Performances (planned table: results_performances)

Represents official recorded performance.

### Fields
- `id`
- `entry_id`
- `mark_seconds` / `mark_value`
- `place`
- `wind` (optional)
- `status` (DNS, DNF, DQ)
- `official_verified` (bool)
- `created_at`

### Notes
- Results also mirrored into `athlete_performances` for profile/history.

---

## 8. Result Publication

- After all performances are recorded:
  - Calculate placements
  - Calculate team scores
  - Publish results to meet page
  - Push verified marks to athlete profiles

---

## 9. Exports

- CSV, JSON, and standard governing body formats
- Export meets, entries, heat sheets, and results

