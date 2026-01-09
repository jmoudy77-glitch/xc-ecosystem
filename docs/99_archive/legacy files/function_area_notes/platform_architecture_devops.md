# Platform Architecture & DevOps — Consolidated Notes

**Generated:** 2025-12-27
**Area:** Platform Architecture & DevOps

## Purpose
Provide a stable, scalable foundation (multi-tenant SaaS) that keeps data secure, supports modular growth, and makes development repeatable without frequent refactors.

## What this area covers
Next.js + Supabase + RLS patterns, server actions, Stripe billing, environment/deployment notes, and the “DB → API → UI” discipline referenced in snapshots.

## Current state captured in snapshots
Snapshots mention a strict DB→API→UI workflow and broad coverage across layout, dashboard, billing, and staff pages. Billing and multi-tenant concerns recur in the broader project context, and the docs show ongoing stabilization work.

## UX and interaction patterns
Architecture decisions should support UX: fast server-side data loading, predictable state, and minimal UI edge cases. Centralize reusable data logic (server actions) rather than scattering inline queries.

## Data, entities, and integration points
Tenancy boundaries, RLS enforcement, canonical schemas, and migration discipline are central. Integration points include Stripe subscription states, program/team/athlete entities, and normalized event/result data for performance and recruiting.

## AI and advanced analytics hooks
AI modules depend on well-modeled, consistent data and auditability. The platform layer must provide versioned inputs, safe access patterns, and clear service boundaries for AI inference.

## Next steps and open items
Reconcile schema documentation with current migrations. Ensure RLS policies match intended tenancy. Standardize server action patterns. Validate Stripe plan codes and subscription flows against the current product model.

## Source files included
- 2025-12-06-snapshot.md
- 2025-12-08 snapshot.md
- 2025-12-09-snapshot.md
- 2025-12-10_snapshot.md
- 2025-12-12-snapshot.md
- 2025-12-13-snapshot.md
- 2025-12-15-snapshot.md
- 2025-12-16-snapshot.md
- 2025-12-17-snapshot.md
- 2025-12-26-snapshot.md
- dev-log-2025-12-01.md
- session-snapshot-2025-12-03.md
- session-summary-2025-12-01.md
- session-summary-2025-12-02.md

## Extracted notes (verbatim-ish)
- Stripe → Webhook → Supabase → Billing UI all in sync
- Rebuilt cancel-practice API route and fixed Supabase server client import.
- Deleted or disabled old `/billing` pages causing Vercel build failures.
- The struggle around Next.js cookie APIs and Supabase SSR helpers
- Full end-to-end Stripe billing loop successfully completed.
- **Program-level Stripe billing** is now working end-to-end:
- Deployed environment now correctly uses Stripe test keys.
- `supabase.auth.getUser()` was failing inside API routes
- ✅ **No deployment errors** (Vercel build succeeds).
- Removed legacy billing pages breaking deployments.
- Ensured only billing API routes remain active.
- Corrected API path mismatch (`rosterId` vs `rosterEntryId`) that caused DELETE operations to 405 on Vercel.
- 1. **No explicit `apiVersion`** in `new Stripe(...)` to avoid TS conflicts with your installed Stripe types.
- We **do not** rely on `params` from the handler context (Next.js 16 made `params` a `Promise`), so we:
- Dark-themed UI now consistent across **layout, dashboard, billing, and staff pages**.
- The `supabaseServer.ts` iterations to fix `req.cookies.get` / `cookies().get` issues
- Next.js 16 route handler / `params` changes are fully handled with a robust pattern.
- All work now compiles cleanly with **no terminal, editor, or deployment errors**.
- Stripe checkout → subscription → webhook → database → UI now works flawlessly.
- Added UNIQUE constraint to `program_subscriptions.stripe_subscription_id`.
- Fixed PostgREST error caused by misuse of `.is()` with non-null values.
- Surface key data: roster count, board activity, staff, billing status.
- `athletes` table had RLS enabled but **no policies**, blocking reads.
- **Always DB-outward**: identity truth lives in Postgres, not UI state
- Add server action or caching layer to hydrate practices on calendar.
- Database saves are fully functional and aligned with actual schema.
- `app/programs/[programId]/billing/ProgramBillingPageClient.tsx`
- To look up the Stripe customer id and create a portal session.
- Fixed the `params is a Promise` breaking change in Next.js 15.
- Per-program theming for dashboard, billing, and team screens.
- **Next.js route handlers do NOT automatically carry cookies**
- `app/dashboard/page.tsx` restyled to match the billing page:
- Upgraded `app/programs/[programId]/billing/page.tsx` to:
- `app/programs/[programId]/billing/page.tsx` posts to:
- 1. Attempt cookie-based auth via `supabaseServer(req)`
- Reviewed developer console & Vercel logs for errors.
- **Manage billing** → `/programs/[programId]/billing`
- `app/billing/create-checkout-session/route.ts` now:
- Confirmed proper test-mode behavior in Stripe logs.
- `app/billing/create-portal-session/route.ts` uses:
- Verified webhook round-trip for all Stripe events.
- Program list with links to Overview, Team, Billing
- Next.js route handler signature mismatch resolved:
- Stripe Checkout + Portal buttons both functional
- Uses `supabase.auth.getUser()` to get the user.
- **Activate / Change plan in Stripe** (Checkout)
- bearer token from `supabase.auth.getSession()`
- `app/billing/create-checkout-session/route.ts`
- Confirmed UI updates on deployed billing page.
- Subscription correctly inserted in Supabase.
- Replaced live keys with test keys in Vercel.
- Billing UI now reflects active subscription.
- Auth session correctly resolves in API route
- `app/programs/[programId]/billing/page.tsx`
- Fixed Next.js `cookies()` async handling.
- `supabaseAdmin.ts` (export adjustments)
- Staff avatar upload (Supabase Storage)
- Checked subscription row in Supabase.
- **Program Billing page**, dark theme:
- Athlete & program billing alignment
