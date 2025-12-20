# Information Architecture Map
*(XC‑Ecosystem — UI Reorganization Reference)*

## Constitution-Level North Star
> **Top level menu is what coaches want to do, and the things they simply must do live elsewhere.**

This IA map applies that doctrine by separating:
- **Athletic (Do)**: what coaches *want* to do daily
- **Resources (Explore)**: optional, program‑enhancing, safe to ignore
- **Administration (Must)**: governance/obligation work, accessed deliberately
- **System/Utility**: authentication, claims, debugging, APIs (never in nav)

---

## Top-Level Navigation

### Athletic
1. **Dashboard**
2. **Athletes**
3. **Training**
4. **Recruiting**
5. **Meets** *(planned)*

### Support
6. **Resources**

### Governance
7. **Administration**

**Not in nav (profile menu / utility):** Account, Billing, Login/Logout, etc.

---

## Route Inventory Classification
Based on current route inventory output (Dec 2025). Routes are grouped by the *intended* IA surface.

### 1) Dashboard (Athletic)
**Primary surfaces**
- `/dashboard`
- `/programs/[programId]/dashboard`
- `/dashboard/programs/[programId]`
- `/dashboard/programs/[programId]/inquiries`
- `/dashboard/programs/[programId]/recruiting`

**Design intent**
- Calm “state of program” + invites to act
- Statuses (non‑screaming) for admin obligations

---

### 2) Athletes (Athletic)
**Primary surfaces**
- `/athletes/me`
- `/athletes/[athleteId]`

**Supporting APIs (not nav)**
- `/api/athlete/me`
- `/api/athlete/profile`
- `/api/athletes/[athleteId]/profile`
- `/api/athletes/[athleteId]/avatar`
- `/api/athletes/[athleteId]/media`
- `/api/athletes/[athleteId]/training`
- `/api/athletes/[athleteId]/training/[sessionId]`
- `/api/athletes/[athleteId]/training/assign`
- `/api/athletes/[athleteId]/training/events`
- `/api/athletes/[athleteId]/training/events/[eventId]`
- `/api/athletes/[athleteId]/training/practices`
- `/api/athletes/[athleteId]/training/practices/[practiceId]`
- `/api/athletes/[athleteId]/training/practices/[practiceId]/generate-sessions`
- `/api/athletes/[athleteId]/training/practices/[practiceId]/groups`
- `/api/athletes/[athleteId]/training/practices/[practiceId]/groups/[groupId]`
- `/api/athletes/[athleteId]/training/practices/[practiceId]/groups/[groupId]/assignments`
- `/api/athletes/[athleteId]/training/workouts`
- `/api/athletes/[athleteId]/training/workouts/[workoutId]`
- `/api/programs/[programId]/athletes`

**Design intent**
- The “people workspace” that unifies all contexts

---

### 3) Training (Athletic)
**Primary surfaces**
- `/programs/[programId]/training`
- `/programs/[programId]/training/workouts`
- `/programs/[programId]/training/workouts/[workoutId]`
- `/programs/[programId]/training/exercises`
- `/programs/[programId]/teams/[teamId]/seasons/[seasonId]/practice`

**Supporting APIs (not nav)**
- `/api/practice/save`
- `/api/practice/cancel`
- `/api/practice/refresh-heat`
- `/api/programs/[programId]/training/workouts`
- `/api/programs/[programId]/training/workouts/[workoutId]`
- `/api/programs/[programId]/training/workouts/[workoutId]/clone`
- `/api/programs/[programId]/training/workouts/[workoutId]/steps`
- `/api/programs/[programId]/training/exercises`
- `/api/programs/[programId]/training/exercises/[exerciseId]`
- `/api/programs/[programId]/training/exercises/[exerciseId]/clone`
- `/api/programs/[programId]/training/sessions`
- `/api/programs/[programId]/training/sessions/[sessionId]`

**Design intent**
- Coach daily planning & execution
- Practice builder modal + calendar are flagship experiences

---

### 4) Recruiting (Athletic)
**Primary surfaces**
- `/programs/[programId]/recruiting`
- `/programs/[programId]/scoring`

**Supporting APIs (not nav)**
- `/api/programs/[programId]/recruits`
- `/api/programs/[programId]/inquiries`
- `/api/programs/[programId]/inquiries/[inquiryId]`
- `/api/programs/[programId]/scoring`
- `/api/scoring/recompute`

**Dev-only (not nav)**
- `/debug/scoring`

**Design intent**
- Pipeline, evaluation, decisions; AI can assist but coach decides

---

### 5) Meets (Planned)
**Planned surfaces**
- *(none yet in current inventory as a first-class page)*

**Design intent**
- Competition planning, lineups, meet prep, post-meet review

---

### 6) Resources (Support / Optional)
**Primary surfaces**
- *(to be created/organized as a stable “optional” home)*

**Initial contents**
- **Gear Locker** *(Coming Soon)* — program culture & identity, not admin
- **Knowledge Base** *(internal library)*

**Current routes (resource-like)**
- `/knowledge`
- `/knowledge/bucket/[bucket]`
- `/knowledge/[...slug]`

**Static assets**
- `/docs/milestones/milestone-map.html` *(Milestone Map static HTML)*

**Design intent**
- Optional, non-urgent, aspirational; safe to ignore
- Encourages exploration without anxiety

---

### 7) Administration (Governance / Must)
**Primary surfaces**
- `/programs/[programId]/staff`
- `/programs/[programId]/staff/[memberId]`
- `/programs/[programId]/settings/branding`
- `/programs/[programId]/billing`
- `/programs/[programId]/account`

**Roster & scholarship (Admin domain with dashboard statuses)**
- `/programs/[programId]/teams/[teamId]/roster-planning`
- `/programs/[programId]/teams/[teamId]/scenarios/[scenarioId]`
- `/programs/[programId]/teams/[teamId]/active-roster` *(borderline; treat carefully)*
- `/programs/[programId]/teams/[teamId]/seasons/[seasonId]/roster`
- `/programs/[programId]/teams/[teamId]/seasons/[seasonId]/scholarship-history`

**Supporting APIs (not nav)**
- `/api/programs/[programId]/staff/[memberId]`
- `/api/programs/[programId]/staff/[memberId]/avatar`
- `/api/programs/[programId]/billing`
- `/api/programs/[programId]/summary`
- `/api/programs/[programId]/teams`
- `/api/programs/[programId]/teams/[teamId]/active-roster`
- `/api/programs/[programId]/team-seasons/[teamSeasonId]/roster`
- `/api/programs/[programId]/teams/[teamId]/roster-candidates`
- `/api/programs/[programId]/teams/[teamId]/seasons`
- `/api/programs/[programId]/teams/[teamId]/seasons/[seasonId]`
- `/api/programs/[programId]/teams/[teamId]/seasons/[seasonId]/budget`
- `/api/programs/[programId]/teams/[teamId]/seasons/[seasonId]/event-group-quotas`
- `/api/programs/[programId]/teams/[teamId]/seasons/[seasonId]/roster`
- `/api/programs/[programId]/teams/[teamId]/seasons/[seasonId]/roster/[rosterEntryId]`
- `/api/programs/[programId]/teams/[teamId]/seasons/[seasonId]/roster/[rosterEntryId]/scholarship`
- `/api/programs/[programId]/teams/[teamId]/seasons/[seasonId]/roster/add-athlete`
- `/api/programs/[programId]/teams/[teamId]/seasons/[seasonId]/roster/add-recruit`
- `/api/programs/[programId]/teams/[teamId]/seasons/[seasonId]/roster/import`
- `/api/programs/[programId]/teams/[teamId]/seasons/[seasonId]/roster/import/suggest-mapping`
- `/api/programs/[programId]/teams/[teamId]/seasons/[seasonId]/scholarship-history/export`
- `/api/programs/[programId]/teams/[teamId]/roster-scenarios/[scenarioId]/entries`
- `/api/programs/[programId]/teams/[teamId]/roster-scenarios/[scenarioId]/entries/[entryId]`
- `/api/programs/[programId]/teams/[teamId]/roster-scenarios/[scenarioId]/entries/[entryId]/scholarship`
- `/api/programs/[programId]/teams/[teamId]/roster-scenarios/[scenarioId]/entries/add-from-recruit`
- `/api/programs/[programId]/teams/[teamId]/roster-scenarios/[scenarioId]/entries/add-from-roster`
- `/api/programs/[programId]/teams/[teamId]/roster-scenarios/[scenarioId]/returning-candidates`
- `/api/programs/[programId]/teams/[teamId]/roster-scenarios/[scenarioId]/status`
- `/api/programs/[programId]/teams/[teamId]/roster/[rosterEntryId]`

**Design intent**
- Cleanest, most intuitive workflows (minimal touch)
- Connected to athletic flows via *statuses* and *contextual links*, not distractions

---

## Context Selectors (Not Nav Destinations)
**Teams / Program / Season** are *context*, not “work.”

Routes remain, but should be accessed via selectors rather than treated as menu destinations:
- `/programs/[programId]`
- `/programs/[programId]/teams`
- `/programs/[programId]/teams/[teamId]`
- `/programs/[programId]/teams/[teamId]/seasons`
- `/programs/[programId]/teams/[teamId]/seasons/[seasonId]`

---

## System / Utility (Never in Nav)
Authentication, claims, debug, and infra surfaces:
- `/login`, `/logout`, `/signup`, `/home`
- `/claim/[inviteToken]`, `/claim/complete`
- `/programs/create`, `/api/programs/create`
- `/api/me`, `/api/users/avatar`
- `/api/schools/search`
- `/api/stripe/webhook`, `/api/stripe-test`, `/api/supabase-test`
- `/api/ai-test`
- `/billing/create-checkout-session`, `/billing/create-portal-session`
- `/account`, `/billing`

---

## Notes & Guardrails
- **Communications** is not a top-level nav item:
  - contextual actions inside Athletic surfaces
  - dashboard widget (inviting, not interrupting)
  - records/audit trails under **Administration**
- **Gear Locker** lives in **Resources** (visible, aspirational, non-urgent).
- **Knowledge Base** lives in **Resources** (library, not “docs”).

---

## Next Actions Enabled by This IA Map
1. Update top-level nav to: **Dashboard, Athletes, Training, Recruiting, Resources, Administration**
2. Move/repurpose nav items that violate the doctrine (Staff/Settings/Billing/Account → Administration)
3. Convert Teams to a **context selector** (Program → Team → Season)
4. Create/confirm Resources landing page and Knowledge/Gear links
5. Add calm dashboard statuses for admin obligations (roster, scholarships, compliance, etc.)
