# Meet Manager Workflow

The Meet Manager workflow will eventually make the XC-Ecosystem the operating system for hosting and managing meets. While the schema is not yet fully implemented, this document defines the target UX and data flow.

---

## 1. Entry Points

- Main navigation: **Results → Meet Manager**
- From Team Management: “Upcoming Meets” section → “Configure Meet”.
- From a schedule overview (future): list of meets where the program is host.

---

## 2. Primary Use Cases

1. **Create and configure a meet as a host program.**
2. **Define events, sessions, and schedule.**
3. **Manage entries and seeding.**
4. **Capture live results (field + track).**
5. **Publish results and export to governing bodies.**

---

## 3. Meet Configuration Flow

### 3.1 Creating a Meet

1. Host coach/staff clicks **“Create Meet”**.
2. Fill required fields:
   - Name
   - Host program (auto-filled)
   - Location and facility
   - Dates
   - Level (HS, college, etc.)
3. Save creates a `meets` row (planned schema).

---

### 3.2 Defining Events & Sessions

1. On the meet configuration page:
   - Add sessions (e.g., Friday PM, Saturday AM).
   - Add events:
     - Choose from sport-specific event catalog via `event_code`.
     - Assign events to sessions.
     - Configure gender, divisions, and rounds (prelims/finals).

2. UI shows:
   - Timeline view of events.
   - Event list by session.

---

### 3.3 Managing Entries

1. Teams entered in the meet:
   - Either:
     - Hosted program only (intra-squad).
     - Multiple visiting programs.

2. Coaches manage entries:
   - For each event, add athlete entries.
   - Pull athletes from team rosters (`team_roster`) or external rosters.
   - Set seed times/marks where appropriate.

3. Entries saved as `results_entries` (planned table).

---

## 4. Seeding & Heat/Flight Generation

1. For applicable events:
   - Use seed marks to generate heats and lanes (or flights and order).
2. UI provides:
   - Seeding preview.
   - Manual override options.
3. Once finalized:
   - Heat sheets can be printed/exported.
   - Data stored in `results_events` + `results_entries` + lane/order metadata.

---

## 5. Live Results Entry

During competition:

1. **Track Events**
   - Officials or timers select a heat/event.
   - Enter finish order and times.
   - System can:
     - Convert times to `mark_seconds`.
     - Apply wind or other adjustments (future).
   - Save results to `results_performances` and/or `athlete_performances`.

2. **Field Events**
   - Officials enter marks per attempt or final result.
   - System determines placings and scoring.

UI goals:

- Fast, keyboard-friendly entry for field and track events.
- Clear indication of which events are completed, in-progress, or pending.

---

## 6. Scoring & Publishing

1. Once results for an event are completed:
   - System calculates:
     - Individual placements.
     - Team points (based on meet scoring rules).

2. Once the meet is finalized:
   - Results can be:
     - Published within the XC-Ecosystem (team and athlete views).
     - Exported to standard formats for governing bodies.
     - Used to update `athlete_performances` as official results.

---

## 7. Integration with Other Subsystems

- **Results**
  - Meet Manager is the structured input pipeline for official results.
- **Athlete Profile**
  - New performances appear under Performance tab with correct attribution.
- **Team Ops & Roster**
  - Helps coaches plan rosters and practice workloads around meet schedule.
- **Recruiting**
  - High-level meet performance data feeds scout scores and recruiting insights.

---

## 8. Permissions

- Host program staff:
  - Full create/configure rights for meets they host.
- Visiting program staff:
  - Manage entries for their athletes only.
- Officials:
  - Enter results for assigned events.
- System / Admin:
  - Override abilities for correcting mistakes.

The Meet Manager workflow will be evolved alongside the Results schema and Universal Event Model. This doc acts as the UX and flow reference for that evolution.
