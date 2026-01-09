# Session Logs & Meta — Consolidated Notes

**Generated:** 2025-12-27
**Area:** Meta / Session Logs

## Purpose
Provide a consolidated index of session snapshots, summaries, and logs, and preserve cross-cutting decisions that inform multiple modules.

## What this area covers
Session snapshots, dev logs, trial notes, and other meta documents that track progress and decisions across the platform.

## Current state captured in snapshots
The snapshot set documents UI decisions, module progress, and recurring principles. This area is primarily for traceability rather than product-facing specification.

## UX and interaction patterns
Not applicable beyond ensuring decisions are traceable and easy to find.

## Data, entities, and integration points
Not applicable beyond organizing the snapshot corpus and keeping it searchable.

## AI and advanced analytics hooks
Not applicable beyond recording AI-related decisions and linking to the AI module document.

## Next steps and open items
Keep a lightweight index updated as new snapshots are created, with links into the functional area documents as the source of truth.

## Source files included
- 2025-12-04-snapshot.md
- 2025-12-06-snapshot.md
- 2025-12-08 snapshot.md
- 2025-12-12-snapshot.md
- 2025-12-15-snapshot.md
- 2025-12-16-snapshot.md
- 2025-12-17-snapshot.md
- 2025-12-18_snapshot.md
- 2025-12-19_snapshot.md
- 2025-12-24-session-snapshot.md
- 2025-12-26-session-snapshot.md
- 2025-12-26-snapshot.md
- session-snapshot-2025-12-03.md
- session-summary-2025-12-02.md

## Extracted notes (verbatim-ish)
- 4. If `owner_id` is missing, logs a warning and skips the event (this caught earlier misconfigured sessions).
- **Right side:** Percentiles, Academics snapshot, Training summary, Offer summary, Communication.
- **Left side:** PRs, Academics, Recruiting overview, Training snapshot, Wellness.
- Sanity-checked threshold logic differentiating *out* vs *returning*.
- Snapshot of prior page is implicitly preserved (by page separation)
- Encapsulated logic in a **small, auditable pure helper**.
- `practice_plans.weather_snapshot`, WBGT fields, etc.
- Whiteboard pages are **snapshotted**, not destroyed.
- Scholarship logic unified across rosters & scenarios
- Verified `performance_balance_snapshots` population
- Remove all JSON parsing logic from `WorkoutsClient`
- Visual & psychological separation between:
- Added dev-friendly logout for testing
- Duplicate detection logic functional
- 3. Completing slide-out content logic
- `public.practice_weather_snapshots`
- `app/login/LoginPageClient.tsx`
- Updated shared `<Avatar/>` component behavior so uploaded images render correctly without oval masking unless explicitly requested.
- `AddPracticeDialogTrigger`
- Real AI logic / inference
- Promotion logic enforces:
- 4. **Analytics / logging**
- 3. **Home resolver logic**
- `row.athletes` comes back as an **array**, so we adjusted the mapping to treat it as such and safely pick the first element:
- `LoginPageClient` now:
- `app/login/page.tsx`
- Resume on next login
- Each workout is a **composed structure** of ordered steps, each step referencing an exercise with overridable parameters
- button opens planner flow → choose team (season defaults current) → planner opens to week → choose day → build practice
- Confirmed that **density → intensity** physics alone sufficiently communicate strain without additional color overlays.
- Logo & background
- Moved all tools (Budget, Budget Controls, What-if Calculator, Scholarship Audit) into one unified sidebar `<aside>`.
- Both **coach-side** and **athlete-side** training session updates are fully supported and tracked via `updated_at`.
- Updated `/api/practice/save` route to ensure `program_id` is included for all `athlete_training_sessions` inserts.
- Patent roadmap
- Events logged:
- Added temporary link in the global header (Dashboard bar) to jump directly to a specific athlete for development:
- Color applies to the *statement panel container* (border, CTA affordances, hover cues), **not** the text itself.
- Ensured athlete images retain proper aspect ratio and do not distort when used in square or rectangular frames.
- Restored visual **solidity and clarity** to balance fields after popover and layering changes introduced haze.
