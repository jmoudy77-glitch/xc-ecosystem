# AI & Analytics Modules — Consolidated Notes

**Generated:** 2025-12-27
**Area:** AI & Analytics Modules

## Purpose
Deliver advanced analytical capabilities (Scout Score, Commit Probability, Pipeline Projection, etc.) that provide insights coaches cannot replicate with manual tools—while remaining explainable and subordinate to coach control.

## What this area covers
AI positioning, avatar/voice concepts, analytics modules vs tool modules, and the integration philosophy that keeps AI additive, not intrusive.

## Current state captured in snapshots
Notes reference AI avatar work, “recruiting clarity powered by AI,” and a broader philosophy where analytics modules sit above operational tools. The narrative emphasizes that these modules are structurally new and should feel materially more capable than typical dashboards.

## UX and interaction patterns
AI outputs should appear as clear recommendations with rationale and confidence, presented where decisions occur (recruiting board, practice planning, performance rollups). The UI should make it obvious what AI influenced and how to undo or disregard it.

## Data, entities, and integration points
AI consumes normalized athlete, roster, performance, and program-health signals. Outputs are persisted as explainable artifacts (scores, probability estimates, projections) tied to specific inputs and timestamps to preserve auditability.

## AI and advanced analytics hooks
Implementation emphasis: modular AI services, strict boundaries between data collection and inference, and clear “human-in-the-loop” acceptance points. Where an avatar is used, it should be a presentation layer over the same transparent insights, not a separate source of truth.

## Next steps and open items
Define the canonical AI artifacts (schemas for scores/projections). Establish evaluation and monitoring (drift, bias checks, calibration). Integrate AI into one workflow at a time (recruiting first is implied), then expand to performance and planning.

## Source files included
- 2025-12-06-snapshot.md
- 2025-12-08 snapshot.md
- 2025-12-10_snapshot.md
- 2025-12-12-snapshot.md
- 2025-12-14-snapshot.md
- 2025-12-19_snapshot.md

## Extracted notes (verbatim-ish)
- 2. Start wiring dynamic athlete subdata (PRs, academics, training, insights)
- AI-powered daily updates, suggestions, training insights.
- Displays only the AI avatar and listening indicator.
- Stored and rendered from `/public/ai/avatars/`
- A calm, non-intrusive but powerful AI UI model
- ⏭ Training, Recruiting, Analytics next
- Program-branded AI avatar integration
- Updated shared `<Avatar/>` component behavior so uploaded images render correctly without oval masking unless explicitly requested.
- AI avatar designed as:
- Both **coach-side** and **athlete-side** training session updates are fully supported and tracked via `updated_at`.
- Ensured athlete images retain proper aspect ratio and do not distort when used in square or rectangular frames.
- The **API surface** for practices, groups, assignments, and training sessions is consistent and secure.
- Returns the updated `athlete_training_sessions` row or appropriate error codes (400/401/403/404/500).
- `app/api/programs/[programId]/training/practices/[practiceId]/groups/[groupId]/assignments/route.ts`
- **Right side:** Percentiles, Academics snapshot, Training summary, Offer summary, Communication.
- This route allows an **athlete** to update their own `athlete_training_sessions` record with:
- `GET /api/programs/[programId]/training/practices/[practiceId]/groups/[groupId]/assignments`
- 4. Load existing `athlete_training_sessions` for that practice/group set to avoid duplicates.
- Ensure it aligns visually and structurally with the practice/session model we built today.
- 2. Beginning to wire real PR, academic, percentile, training, recruiting, and wellness data
- `app/api/programs/[programId]/training/practices/[practiceId]/groups/[groupId]/route.ts`
- Preloading working for core practice details (assignment hydration to be handled later).
- AI owns opinions and recommendations but **always defers final authority** to the coach.
- **GET** `/api/programs/[programId]/training/practices?teamSeasonId=...&from=...&to=...`
- Added full-screen weather detail popover triggered by day panel, not heat index only.
- Group and individual workouts now insert correctly into `athlete_training_sessions`.
- `GET /api/programs/[programId]/training/practices?teamSeasonId=...&from=...&to=...`
- `POST /api/programs/[programId]/training/practices/[practiceId]/generate-sessions`
- Will later include deep behavior such as notes, scoring, and training assignments.
- **Left side:** PRs, Academics, Recruiting overview, Training snapshot, Wellness.
- `app/api/programs/[programId]/training/practices/[practiceId]/groups/route.ts`
- `app/api/programs/[programId]/training/practices/[practiceId]/route.ts`
- Voice-first interaction with visual reinforcement only when beneficial.
- Set a credible foundation for athlete trust, claims, and deduplication
- **DELETE** `/api/programs/[programId]/training/practices/[practiceId]`
- **PATCH** `/api/programs/[programId]/training/practices/[practiceId]`
- **GET** `/api/programs/[programId]/training/practices/[practiceId]`
- Program header and workspace **reserve space** when AI tray opens
- `GET /api/programs/[programId]/training/practices/[practiceId]`
- Calls `GET /api/athletes/[athleteId]/training` (to be defined).
