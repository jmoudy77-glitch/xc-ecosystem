# Recruiting Module — Consolidated Notes

**Generated:** 2025-12-27
**Area:** Recruiting

## Purpose
Consolidate the recruiting experience into a single, coach-first system: identify prospects, evaluate fit, manage communications and status, and translate recruiting decisions into roster and scholarship outcomes without relying on fragmented spreadsheets, inbox searches, or ad hoc notes.

## What this area covers
Recruit boards, prospect profiles, communications workflows, pipeline states, and the downstream handoff into roster-building (including scholarship/spot decisions). Includes the outward-facing recruiting portal concept where athletes/prospects enter the pipeline and coaches manage them centrally.

## Current state captured in snapshots
Snapshots emphasize a recruiting board MVP with immediate utility and a “pipeline-first” workflow. Notes repeatedly reinforce that roster-building is downstream of recruiting (and recruiting is downstream of Program Health), and that recruiting should integrate with scoring and pipeline projections over time.

## UX and interaction patterns
The recruiting board is treated as the operational hub: coaches work from a live board, quickly add/triage prospects, and use low-friction interactions (cards, modals, clear status movement) to keep the workflow moving. Visual cues like “drop-to-remove-from-roster” hints are mentioned as part of reducing cognitive load.

## Data, entities, and integration points
Prospect records link PR/performances, academics, recruiting notes, status/pipeline stage, and related artifacts (accolades, media, training snapshot where applicable). Integration points include: athlete accolades storage, universal seeding / results ingestion concepts, and program-level dashboards that surface recruiting health alongside training and wellness signals.

## AI and advanced analytics hooks
AI is positioned as an amplifier for recruiting clarity (e.g., Scout Score, Commit Probability, Pipeline Projection). The snapshots frame these as analytical modules that sit “above” operational tools—augmenting decisions rather than replacing coach judgment. The recruiting narrative includes the recruiting portal and advanced analytical modules as differentiators.

## Next steps and open items
Harden the recruiting board MVP into a stable, repeatable flow (add → evaluate → communicate → advance/hold/close). Define canonical pipeline states and required fields per stage. Confirm the data contract between recruiting and roster (what must be true before a recruit can be rostered). Then layer analytics: score rollups, commit probability signals, and pipeline projections tied to program needs.

## Source files included
- 2025-12-04-snapshot.md
- 2025-12-06-snapshot.md
- Performance Module ΓÇö Actionable Clarity & UI Architecture Snapshot.md
- marketing-positioning.md
- onboarding-flows.md
- patenting-overview.md
- session-summary-2025-12-02.md
- universal-seeding-strategy.md

## Extracted notes (verbatim-ish)
- HS recruits must flow through recruiting portal before roster inclusion
- Recruiting overview will integrate with scoring & pipeline later
- Recruiting pipeline
- 2. Beginning to wire real PR, academic, percentile, training, recruiting, and wellness data
- **Left side:** PRs, Academics, Recruiting overview, Training snapshot, Wellness.
- Combines **team management + recruiting + athlete development**
- 4. Start training log, recruiting profile, accolades
- 5. Begin using dashboards / recruit boards
- 3. **Dynamic recruiting board workflow**
- “Recruiting clarity powered by AI.”
- Recruit boards have instant value
- 3. **Recruiting Board MVP**:
- Is recruiting healthy?
- **Right side:** Percentiles, Academics snapshot, Training summary, Offer summary, Communication.
- Cleaned up transition bug where recruit boxes were flying in from the bottom.
- Added “drop-to-remove-from-roster” visual hint block in recruit panel.
- College transfers will feed into a dedicated transfer portal system
- To look up the Stripe customer id and create a portal session.
- Highlights both selected recruit & card in yellow border.
- `app/billing/create-portal-session/route.ts` uses:
- Checkout and customer portal wired to the program
- Stripe Checkout + Portal buttons both functional
- Implemented sliding “Recruit Details Card”:
- AI-driven projections no competitor offers
- Recruit card now draggable into roster.
- 1. **AI scouting & projection pipeline**
- Eligible recruits filtering restored
- 1. Fix gender filter in recruit panel
- Updated shared `<Avatar/>` component behavior so uploaded images render correctly without oval masking unless explicitly requested.
- **Open Stripe customer portal**
- Recruit filtering fixed
- Moved all tools (Budget, Budget Controls, What-if Calculator, Scholarship Audit) into one unified sidebar `<aside>`.
- Added temporary link in the global header (Dashboard bar) to jump directly to a specific athlete for development:
- Ensured athlete images retain proper aspect ratio and do not distort when used in square or rectangular frames.
- 4. If `owner_id` is missing, logs a warning and skips the event (this caught earlier misconfigured sessions).
- Corrected API path mismatch (`rosterId` vs `rosterEntryId`) that caused DELETE operations to 405 on Vercel.
- 1. **No explicit `apiVersion`** in `new Stripe(...)` to avoid TS conflicts with your installed Stripe types.
- Sidebar now slides out smoothly from the right and **pushes the roster left** with a pleasing transition.
- We **do not** rely on `params` from the handler context (Next.js 16 made `params` a `Promise`), so we:
- Initial stabilization of `/api/me`, dashboard, and removal of stale `organizations` references
