# Results Verification & Statuses

Defines the states of competition results and visibility rules.

## 1. Performance Types

- `training`
- `self_reported`
- `verified_meet` (official)

## 2. Verification

### Workflow
1. Raw results imported or recorded.
2. Official verifies entries.
3. System marks `official_verified = true`.
4. Public visibility enabled.

### Flags
- `official_verified` — indicates sanctioned authenticity.
- `status` — DNS, DNF, DQ, NT.

## 3. Visibility

- Verified results may appear in:
  - Athlete profiles
  - Public result pages
  - Leaderboards

- Unverified results restricted to:
  - Athlete
  - Program that created them

## 4. Integrity

- Locks occur after verification.
- Edits require admin override.

