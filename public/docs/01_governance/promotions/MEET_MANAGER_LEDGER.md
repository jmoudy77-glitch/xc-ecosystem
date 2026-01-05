# Meet Manager — Promotion Ledger

**File:** `/public/docs/01_governance/promotions/MEET_MANAGER_LEDGER.md`  
**Module:** meet_manager  
**Purpose:** Canonical ledger of promotions applied for the Meet Manager module.

---

## Conventions

- Each row corresponds to a single promotion that was committed and pushed.
- If a commit hash is not recorded here, it must be recovered from `git log` and backfilled later.
- This ledger is governance-facing; it tracks **what was promoted**, not how it was implemented.

---

## Ledger

| Date (local) | Promotion | Artifact(s) | Commit |
|---|---|---|---|
| 2026-01-05 | Add canonical state machines + status enums v1.2 | `docs/Meet_manager/state_machines_v1.2.md` | — |
| 2026-01-05 | Add routing contracts v1.2 | `docs/Meet_manager/routing_contracts_v1.2.md` | — |
| 2026-01-05 | Add ops token lifecycle v1.2 | `docs/Meet_manager/ops_token_lifecycle_v1.2.md` | — |
| 2026-01-05 | Add results pipeline contracts v1.2 | `docs/Meet_manager/results_pipeline_contracts_v1.2.md` | f86662a |
| 2026-01-05 | Add display feed contracts v1.2 | `docs/Meet_manager/display_feed_contracts_v1.2.md` | 62e470f |
| 2026-01-05 | Add Supabase schema + RLS contracts v1.2 | `docs/Meet_manager/supabase_schema_rls_v1.2.md` | 55aacf4 |
| 2026-01-05 | Add enum materialization plan v1.2 | `docs/Meet_manager/enum_materialization_plan_v1.2.md` | — |
| 2026-01-05 | Lock event state columns to Option A | `docs/Meet_manager/enum_materialization_plan_v1.2.md` | — |
| 2026-01-05 | Align enum value casing rules to canonical lowercase v1.2 | `docs/Meet_manager/enum_materialization_plan_v1.2.md` | — |
| 2026-01-05 | Add v1.2 core schema migration scaffold | `supabase/migrations/20260105190000_meet_manager_v1_2_core_schema.sql` | — |
| 2026-01-05 | Materialize v1.2 enum values from canonical state machines | `supabase/migrations/20260105201500_meet_manager_v1_2_enum_values.sql` | — |
| 2026-01-05 | Enforce no __PLACEHOLDER__ enum usage v1.2 | `supabase/migrations/20260105203000_meet_manager_v1_2_enum_placeholder_guards.sql` | — |
| 2026-01-05 | Add server action boundaries v1.2 | `docs/Meet_manager/server_action_boundaries_v1.2.md` | — |
| 2026-01-05 | Stub public API routes (live results, field scoring, display feeds) | `app/api/public/meets/[meetId]/live/route.ts` + related route stubs | — |
| 2026-01-05 | Add minimal read server actions (meet home/roster/entries/events) | `app/actions/meet_manager/getMeetHome.ts` + related actions | — |
| 2026-01-05 | Wire meet manager routes + initial meet home page | `app/programs/[programId]/meets/page.tsx`, `app/programs/[programId]/meets/[meetId]/page.tsx` | — |

