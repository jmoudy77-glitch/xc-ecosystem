# Results Schema

The Results domain captures performance outcomes for athletes across sports and contexts. It underpins athlete stats, recruiting evaluations, and team reporting.

Currently, results are stored primarily in `athlete_performances`. Future structured results tables will add richer meet and event modeling.

---

## 1. Current Table: `athlete_performances`

### 1.1 Purpose

- Represent individual performance outcomes (times, distances, points) for an athlete.
- Distinguish between official meet results, training efforts, and self-reported marks.
- Serve as the primary input for PRs, season bests, and AI models.

### 1.2 Columns (Key)

- `id uuid` – Primary key.
- `athlete_id uuid NOT NULL`
  - FK → `athletes.id`
- `event_code text NOT NULL`
  - Encodes the event (e.g., `TFR_1500M`, `XC_5K`, `SWM_100FREE`).
- `mark_seconds numeric`
  - For time-based events, normalized to seconds.
- `mark_value numeric`
  - Generic numeric performance value (distance, points, etc.).
- `is_personal_best boolean`
  - Application logic must maintain this flag per event.
- `performance_date date`
- `meet_name text`
- `location text`
- `performance_type text NOT NULL`
  - `'verified_meet'`, `'self_reported'`, `'training'`.
- `timing_method text`
  - `'FAT'`, `'manual'` for time-based events.
- `source_program_id uuid`
  - FK → `programs.id`
- `created_by_user_id uuid`
  - FK → `users.id`
- `created_at`, `updated_at`

### 1.3 RLS & Visibility

- Public, verified performances may be visible across programs.
- Unverified or training/self-reported performances may be restricted to:
  - The program that created them.
  - The athlete themselves.

Verification logic is expanded in `/docs/results/verification-and-statuses.md`.

---

## 2. Future Structured Results Tables (Planned)

To better support meet management and multi-sport modeling, the Results domain will likely introduce:

- `meets`
  - High-level meet metadata (host program, location, dates, level).
- `meet_sessions`
  - Meet days / sessions (AM, PM).
- `results_events`
  - Event definitions within a meet (e.g., Men’s 1500m final).
- `results_entries`
  - Athlete/team entries into specific events.
- `results_performances`
  - Structured performance results tied to event and entry rows.

The exact names may vary, but the pattern follows the Universal Event Model defined in `/docs/architecture/event-model.md` and `/docs/results/meet-structure.md`.

---

## 3. Universal Event Model Overview

The Universal Event Model provides a common structure:

- **Event Definition**
  - Global metadata for event types.
- **Event Instance**
  - A specific occurrence of an event in a meet.
- **Performance**
  - The outcome for a given athlete/team in that event instance.

`event_code` will be a key piece of glue:

- It links performances to event definitions.
- It drives UI grouping and filters.
- It allows AI models to interpret performances consistently across meets and seasons.

---

## 4. Integration with Other Domains

- **Athlete Profile**
  - Performance tab is derived from `athlete_performances` (and future results views).
- **Recruiting**
  - AI models use performances for scout scores and event fit.
- **Roster & Seasons**
  - Team reports and season summaries rely on aggregations of results.
- **Team Ops & Meet Manager**
  - Meet Manager is the input mechanism for structured results.

---

## 5. Data Quality & Ownership

- `performance_type` and eventual status fields (e.g., `pending`, `coach_verified`, `official_verified`, `locked`) determine how results are treated.
- Meet hosts and officials are responsible for verifying competition results.
- Programs may add training or testing performances, but these are clearly labeled and may be treated differently in AI and reporting.

See `/docs/results/verification-and-statuses.md` and `/docs/security/data-ownership.md` for more details.
