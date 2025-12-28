# Data Ownership

This document clarifies who “owns” which types of data in the XC-Ecosystem and how that impacts RLS, export rights, and feature design.

---

## 1. Ownership Categories

1. **Athlete-Owned Data**
   - Personal identity information (name, date of birth where stored, contact details).
   - Self-reported training logs.
   - Self-entered profile details (bio, academic info where allowed).

2. **Program-Owned Data**
   - Rosters, scholarship allocations, internal notes, and evaluations.
   - Recruiting board entries (program’s view of an athlete).
   - Practice plans and S&C programs.
   - Meet entries and lineups when the program is the competing team.

3. **Meet Host-Owned Data**
   - Raw results from meets (times, distances, rankings).
   - Meet configuration (events, schedule, heat sheets).

4. **System-Owned Data**
   - Aggregated and anonymized analytics.
   - Derived AI models and their parameters.
   - System-level configurations and catalogs (e.g., event codes).

---

## 2. Practical Implications

### 2.1 Export & Portability

- Programs:
  - May export their own:
    - Rosters.
    - Recruiting data.
    - Training plans.
    - Meet entries and internally stored results.
- Athletes:
  - May export:
    - Their own profile data.
    - Their official results.
    - Their own training history.
- Meet Hosts:
  - May export:
    - Full meet results data for meets they host.

The system may also provide standardized export formats for governing bodies.

---

### 2.2 Deletion & Retention

- If an athlete requests deletion:
  - Direct identifiers and contact info may be removed or anonymized.
  - Historical competition results (especially from official meets) may be retained for statistical and sports-history integrity, but decoupled from PII where feasible.

- Program-specific notes and evaluations:
  - May be deleted when a program terminates or per policy.
  - Do not carry over to other programs.

---

### 2.3 AI Models

- Models trained on aggregated data are considered **system-owned**:
  - Programs and athletes benefit from insights.
  - They do not own the models themselves.
- However:
  - AI outputs for a given program-athlete relationship (`program_athlete_scores`) are considered program-owned and private to that program.

---

## 3. Cross-Entity Sharing

- Public leaderboards and rankings:
  - Built from official meet results and system-owned analytics.
  - No program’s private notes or internal scoring are exposed.

- Transfer portal entries:
  - If opt-in or governed by external rules, may be visible to many programs.
  - Still, notes about a transfer candidate remain program-private.

---

## 4. Design Guidance

When designing new features:

1. Identify which category (athlete, program, meet host, system) owns each data type.
2. Implement RLS and UI access accordingly.
3. Consider export and deletion implications.
4. Update this doc if a new type of data or nuanced ownership model emerges.
