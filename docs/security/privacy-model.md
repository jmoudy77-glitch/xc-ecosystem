# Privacy Model

The Privacy Model defines who can see what information in the XC-Ecosystem, with a focus on protecting athlete data and program-internal evaluations while still enabling effective recruiting and team operations.

---

## 1. Categories of Data

1. **Public Data**
   - Non-sensitive information that can be visible platform-wide.
   - Examples:
     - School names and logos.
     - Program names and basic sport/gender.
     - Officially verified competition results (subject to future rules).

2. **Program-Private Data**
   - Internal notes, evaluations, and planning data owned by a specific program.
   - Examples:
     - `program_athlete_scores`
     - `program_recruits` internal notes.
     - Roster planning scenarios.
     - Scholarship planning details.

3. **Athlete-Private Data**
   - Data visible to the athlete and, where appropriate, to relevant program staff.
   - Examples:
     - Self-reported training logs.
     - Certain portions of the profile (contact info depending on program policy).

4. **System-Private Data**
   - Internal operational data not visible in the UI.
   - Examples:
     - Internal audit logs.
     - Aggregated analytics.
     - Support notes.

---

## 2. Athlete-Centric Privacy Rules

- A single athlete may have relationships with multiple programs.
- Programs must not see each other’s private evaluations or internal recruiting notes for the same athlete.
- Athletes should:

  - See their own:
    - Verified results.
    - Training history.
    - Non-sensitive profile data.
  - Not see:
    - Internal scores or notes a program keeps about them, unless explicitly allowed.

- Sensitive details (injury notes, personal issues) belong in separate, clearly scoped fields/tables and are restricted to authorized staff.

---

## 3. Program-Centric Privacy Rules

- Each program’s:

  - Recruiting board.
  - Roster planning.
  - Scholarship budgets.
  - Coach notes.

  …are private to that program.

- Staff within the program have tiered access according to role:
  - See `/docs/security/permissions-matrix.md`.

- Cross-program visibility is limited to:

  - Public athlete data.
  - Public results (once verified and published).
  - Public transfer portal entries, if modeled that way.

---

## 4. HS vs College Program Boundaries

- High school programs and college programs may both interact with the same athlete.
- Default rule:
  - HS coach notes and evaluations are not visible to college programs.
  - College coach notes are not visible to HS programs.
- The system focuses on sharing objective, verified data (times, distances, meet results), not subjective internal commentary.

---

## 5. Results & Verification

- Self-reported or unverified results:
  - Visible to the originating program and the athlete.
  - Not considered authoritative for public consumption.
- Officially verified results:
  - May be visible to other programs.
  - Are candidates for global leaderboards and rankings.

Details in `/docs/results/verification-and-statuses.md`.

---

## 6. Athlete Contact & Communication

- Athlete contact info must be handled carefully:
  - Stored fields can include email and phone, but access is limited.
  - Only authorized roles may view and use this information (e.g., recruiting staff).
- Communication logs:
  - Stored for compliance and transparency within a program.
  - Not visible to other programs.

---

## 7. Implementation

The Privacy Model is enforced via:

- RLS policies (see `/docs/security/rls-framework.md`).
- Role checks (see `/docs/security/permissions-matrix.md`).
- Application-level filters to avoid over-fetching or exposing sensitive fields.

When building new features or tables:

1. Classify each field into public, program-private, athlete-private, or system-private.
2. Design RLS and API responses accordingly.
3. Update this doc if new categories or exceptions are introduced.
