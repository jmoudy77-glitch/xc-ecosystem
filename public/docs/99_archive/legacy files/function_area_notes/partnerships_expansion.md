# Partnerships & Expansion — Consolidated Notes

**Generated:** 2025-12-27
**Area:** Partnerships & Expansion

## Purpose
Capture expansion vectors that increase value and defensibility (multi-sport, partnerships, outward-facing surfaces) without diluting the core coaching workflows.

## What this area covers
Gear portal/affiliate concepts, branding/onboarding extensions, outward-facing team pages, patenting considerations, and multi-sport expansion framing.

## Current state captured in snapshots
Notes include patenting overview and positioning documents, with explicit mention of branding during onboarding and broader ecosystem expansion.

## UX and interaction patterns
Expansion features must not clutter core coaching workflows. When surfaced, they should feel integrated and optional, with clean boundaries from daily coaching operations.

## Data, entities, and integration points
Partnership and expansion features often require additional entities (vendors, affiliate tracking, public pages, branding assets) that must still respect tenancy and permissions.

## AI and advanced analytics hooks
AI can support expansion features (e.g., automated content for team pages, supplier recommendations), but should remain secondary to core recruiting/training value.

## Next steps and open items
Prioritize expansion ideas by dependency and strategic value. Ensure each expansion feature has a clean data boundary and does not introduce cross-tenant risk. Revisit patent strategy after core modules stabilize.

## Source files included
- 2025-12-13-snapshot.md

## Extracted notes (verbatim-ish)
- Coach account creation → login → onboarding now works end-to-end.
- 4. Capture a formal “return-to” developer note for onboarding.
- `/api/onboarding/coach` rewritten to:
- initialize `program_branding` stub
- Neither → onboarding
- **Canonical Surface Rule**: all flows collapse into a single authoritative page.
- **Idempotent Bootstrap**: re-submitting setup steps never creates duplicates.
- 1. Finalize Team Management hub workflows (roster, practice, scholarships).
- **Role Precedence**: route by active authority, not historical identity.
- **Nullable-safe querying**: `.eq()` vs `.is(null)` pattern standardized.
- Fixed PostgREST error caused by misuse of `.is()` with non-null values.
- Prevents coaches with historical athlete records from being misrouted.
- No automated “return-to” memory file yet (intentionally deferred).
- Email confirmation temporarily disabled for local/dev testing.
- Implemented correct `.eq()` vs `.is(null)` branching pattern.
- Added `credentials: "include"` + Bearer token fallback to:
- **Auth Resilience**: cookie + Bearer fallback everywhere.
- `(program_id + name + sport + gender + level + season)`
- **prevent duplicate programs** (nullable-safe matching)
- Added Bearer token fallback to membership assertion.
- 2. Add roster initialization tied to `team_seasons`.
- `app/programs/[programId]/teams/[teamId]/page.tsx`
- Implemented `isCurrent` promotion/demotion logic.
- Fixed 400 errors due to missing required fields.
- updated season selection to prefer `is_current`
- Implemented **durable role precedence logic**:
- GET now returns `is_primary` for UI awareness.
- 3. Re-enable and test email confirmation flows.
- return a clean `schoolId` for downstream use
- Must be re-enabled before production launch.
- Email confirmation disabled for development.
- Coach with program → team canonical surface
- `(team_id + academic_year + season_label)`
- `academic_year`, `year_start`, `year_end`
- Fixed Next.js `cookies()` async handling.
- hides season-dependent tools until ready
- Updated form to collect required fields:
- require auth (cookie + Bearer fallback)
- Eliminates intermittent auth failures.
- Added auth resilience to fetch calls.
