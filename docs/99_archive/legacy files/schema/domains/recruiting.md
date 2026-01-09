# Recruiting Schema

This document describes the tables powering recruiting, evaluations, inquiries, invites, and transfer portal tracking.

---

## 1. Core Recruiting Identity

### 1.1 `recruiting_profiles`
Canonical recruit identity linked to `athletes`.

- `id`
- `athlete_id` (FK → athletes)
- `profile_type` — usually 'hs'
- `hs_school_id` (FK → schools)
- `current_program_id` (transfer context)
- `created_at`

Represents an athlete’s recruitable identity, used across all programs.

---

## 2. Program-Specific Recruiting Objects

### 2.1 `program_recruits`
A program’s representation of a recruiting profile.

- `program_id`
- `recruiting_profile_id`
- `status` — pipeline stage
- `source` — 'coach_manual', 'inquiry', 'auto_sync'
- `interest_level`
- `primary_coach_member_id`
- `athlete_id`
- Timestamps

This is the main object rendered on the Recruiting Board.

---

### 2.2 `program_athletes`
General relationship table linking a program to an athlete.

- `program_id`
- `athlete_id`
- `relationship_type` — recruit, alum, etc.
- `status`
- `source`
- Creator fields

Used when an athlete transitions from recruit to roster.

---

### 2.3 `program_scoring_profiles`
Program-defined weight sets.

- `program_id`
- `label`
- `weights_json` — academic, performance, conduct, event need
- `is_default`
- Timestamps

---

### 2.4 `program_athlete_scores`
Program-specific evaluations.

- `program_id`
- `athlete_id`
- `scoring_profile_id`
- `overall_for_program`
- `fit_score_for_program`
- `breakdown_json`
- Timestamps

Target location for AI scoring outputs.

---

## 3. Inbound & Outbound Interest

### 3.1 `athlete_inquiries`
Athlete → program.

- `program_id`
- `athlete_id`
- `status` — new, reviewed, accepted, archived
- `primary_event`, `pr_blob`
- Contact info
- `coach_notes`

---

### 3.2 `athlete_invites`
Program → athlete.

- `program_id`
- `athlete_id`
- `invite_token`
- `status` — pending, accepted, expired
- `expires_at`

---

## 4. Transfer Portal

### 4.1 `transfer_portal_entries`
Represents an athlete seeking transfer.

- `athlete_id`
- `current_program_id`
- `recruiting_profile_id`
- `active`
- `entered_at`, `withdrawn_at`

---

## 5. Legacy Tables

### 5.1 `recruits`
Legacy standalone recruit table; avoid for new work.

---

## 6. RLS Considerations

- All program-level tables filter by membership (`program_members.user_id = auth.uid()`).
- Global tables allow limited discovery fields.
- Athletes cannot view program-specific evaluations.

