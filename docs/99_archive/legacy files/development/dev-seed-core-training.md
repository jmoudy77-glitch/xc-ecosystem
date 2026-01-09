# Core Dev Seed — Training & RLS Fixture

This fixture creates a **minimal but realistic XC-Ecosystem environment** for:

- RLS testing (program members vs athletes)
- Practice scheduler & workouts
- Universal Event Model usage
- Athlete training sessions

It pairs with a teardown script so you can safely reset your dev environment.

---

## Files

- Seed:  
  `supabase/fixtures/dev-seed-core-training.sql`

- Teardown:  
  `supabase/fixtures/dev-seed-core-training-teardown.sql`

---

## What the Seed Creates

### Entities

- 2 Schools  
  - Test University A  
  - Test University B  

- 2 Programs  
  - Program 1 (XC)  
  - Program 2 (XC)  

- 4 Users  
  - **Coach A** (Program 1)  
  - **Coach B** (Program 2)  
  - **Athlete X** (on Program 1 roster)  
  - **Athlete Y** (unassigned)

- Program Members  
  - Coach A → Program 1  
  - Coach B → Program 2  

- Athletes  
  - Athlete X  
  - Athlete Y  

- Teams, Team Seasons, Roster  
  - Program 1 XC team  
  - XC 2025 season  
  - Athlete X on Program 1 XC roster  

- Training & Practice
  - `event_definitions`: one example event `TFR_M_1500M`
  - `training_event_templates`: “Threshold Repeats” for Program 1
  - `workouts`: “Threshold Workout” with one step
  - `practice_plans`: “XC Practice” for Program 1 XC 2025
  - `practice_groups`: “Distance” group using the workout
  - `practice_group_assignments`: Athlete X in Distance group
  - `athlete_training_sessions`: one coach-assigned threshold session for Athlete X

---

## Auth IDs for RLS Testing

These are the `users.auth_id` values you can align to Supabase Auth users to simulate roles:

- **Coach A (Program 1)**
  - `auth_id`: `00000000-0000-0000-0000-000000000401`
  - `email`: `coachA@example.com`

- **Coach B (Program 2)**
  - `auth_id`: `00000000-0000-0000-0000-000000000402`
  - `email`: `coachB@example.com`

- **Athlete X**
  - `auth_id`: `00000000-0000-0000-0000-000000000403`
  - `email`: `athleteX@example.com`

- **Athlete Y**
  - `auth_id`: `00000000-0000-0000-0000-000000000404`
  - `email`: `athleteY@example.com`

You can either:

1. Create matching Auth users in Supabase and then set `users.auth_id` to those values, **or**
2. If you already have Auth users, set `auth_id` to match their `auth.users.id`.

---

## How to Run the Seed / Teardown

### Seed (populate environment)

Run as service role (or via Supabase SQL editor with service key):

```bash
-- from CLI
supabase db execute supabase/fixtures/dev-seed-core-training.sql