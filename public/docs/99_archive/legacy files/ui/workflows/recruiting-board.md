# Recruiting Board Workflow

The Recruiting Board is the primary UI for visualizing and managing a program’s recruiting pipeline. It represents `program_recruits` rows as cards in stage-based columns, enriched with AI scores and athlete data.

---

## 1. Entry Points

- Main navigation: **Recruiting → Board**
- From an athlete profile: “Open in Recruiting Board” (for that athlete’s profile).
- From Roster or Scenarios: click “View recruiting status” for a prospect.

---

## 2. Board Layout

- **Header**
  - Filters: grad year, event group, gender, profile type (HS/transfer).
  - Search bar for athlete name or tags.
  - Toggle: Kanban (board) vs Table view.

- **Pipeline Columns**
  - One column per pipeline stage:
    - Discovered
    - Evaluating
    - Pursuing
    - Offer Extended
    - Committed
    - Signed
    - Inactive
  - Each column counts recruits in that stage.

- **Cards (Program Recruit Row)**
  - Name, avatar, grad year.
  - Event group, primary event.
  - Scout score and program fit score (if available).
  - Commit probability indicator (if available).
  - Primary coach assignment.
  - Key tags and notes icon.

---

## 3. Core Flows

### 3.1 Adding a Recruit to the Board

1. Coach clicks **“Add Recruit”** button.
2. Options:
   - Search existing `recruiting_profiles` or `athletes`.
   - Create a new recruit (if allowed, e.g., from `recruits`/legacy).
3. Once selected, a `program_recruits` row is created with:
   - `status = 'discovered'` (default).
   - `program_id` from current context.
   - `recruiting_profile_id` and `athlete_id` where applicable.

---

### 3.2 Moving Recruits Between Stages

1. Coach drags a card from one column to another.
2. On drop:
   - `program_recruits.status` is updated.
   - If movement implies a special transition (e.g., to `committed`):
     - Additional workflows may be triggered:
       - Prompt to create a `program_athletes` link.
       - Offer to add the athlete to a future roster scenario.

3. Business rules (e.g., only certain roles can move to `signed`) are enforced via role checks.

---

### 3.3 Viewing and Editing Recruit Details

1. Clicking a card opens a slide-out:
   - Quick profile view with:
     - PRs and key performances.
     - Academic summary.
     - Contact info (restricted by role).
2. Tabs within slide-out:
   - Activity / notes.
   - Evaluations (from `program_athlete_scores`).
   - Pipeline history (status changes).
   - Linked Inquiries/Invites.

3. Coach can:
   - Adjust interest level and tags.
   - Assign primary coach.
   - Add internal notes.

---

### 3.4 Integrating AI Scores

- Each card may display:
  - **Scout Score** (global).
  - **Program Fit Score** (from `program_athlete_scores`).
  - **Commit Probability** (per program).

AI runs can be:

- On-demand (button) or scheduled.
- Stored back into `program_athlete_scores` or related fields.

---

### 3.5 Filtering & Sorting

Common filters:

- Grad year (e.g., 2025, 2026).
- Event group (e.g., distance, sprints).
- Transfer portal only.
- Score thresholds.

Sorting within a column:

- By program fit score.
- By commit probability.
- By last contact date.

---

### 3.6 Linked Workflows

From a recruit card, coaches can:

- Open full Athlete Profile.
- Jump to Roster Scenarios to project them into a future season.
- Create or view `athlete_inquiries` and `athlete_invites` related to this athlete.
- Open a communication composer (email/text; future integration).

---

## 4. Table View

An alternative Table view:

- Columns: name, grad year, event group, stage, interest, fit score, commit probability, last contact.
- Useful for bulk operations:
  - Change stage for multiple recruits.
  - Adjust interest level.
  - Export to CSV (program-owned data).

---

## 5. Permissions

- Program Admin, Head Coach, and Director of Ops:
  - Full create/update/delete.
- Assistant Coaches:
  - Generally can:
    - View all.
    - Edit most fields.
    - Possibly restricted from changing to `signed`.
- GA / Volunteer:
  - Usually view-only or limited editing of notes.
- Athletes:
  - No access to the Recruiting Board.

Refer to `/docs/security/permissions-matrix.md` for authoritative role definitions.
