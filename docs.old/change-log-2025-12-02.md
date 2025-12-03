# XC-Ecosystem — Change Log
### Date: 2025-12-02

## Frontend

- Added a dark global layout in `app/layout.tsx` with:
  - Top nav (Dashboard, Coach Onboarding, Athlete Onboarding, Program Billing Debug).
  - Unified dark theme and container.
- Restyled `app/dashboard/page.tsx` to use the new layout and dark theme:
  - Account card showing user info and role hint.
  - Athlete subscription card.
  - Programs list with links to Overview, Team, and Manage Billing.
- Updated `app/programs/[programId]/billing/page.tsx`:
  - Dark-themed cards for current plan and plan selection.
  - Functional buttons wired to Stripe Checkout and Stripe Portal.
- Implemented `app/programs/[programId]/staff/page.tsx`:
  - Dark-themed staff table with editable roles and remove actions.

## Backend (API)

- Implemented `GET /api/programs/[programId]/staff`:
  - Returns staff members derived from `program_members` joined to `users`.
  - Enforces that the caller is a member of the program.
- Implemented `PATCH /api/programs/[programId]/staff/[memberId]`:
  - Updates a staff member’s `role`.
  - Parses `programId` and `memberId` from URL segments for Next.js 16 compatibility.
- Implemented `DELETE /api/programs/[programId]/staff/[memberId]`:
  - Removes a staff member from `program_members`.
- Rewrote `app/api/stripe/webhook/route.ts`:
  - Removed hard-coded `apiVersion`.
  - Integrated metadata contract: `scope`, `owner_id`, `plan_code`.
  - Upserts into `program_subscriptions` for `scope === "org"`.
  - Marks subscriptions canceled when deleted events arrive.

## Database

- Added unique constraint to `program_subscriptions`:

```sql
ALTER TABLE public.program_subscriptions
ADD CONSTRAINT program_subscriptions_program_id_key
UNIQUE (program_id);
```

- Ensured `program_subscriptions` is the canonical table for **program-level** billing (replacing any `org_subscriptions` references).

## Behavior / Contracts

- Defined the metadata contract for program-level subscriptions:
  - `scope: "org"`
  - `owner_id: <programId>`
  - `plan_code: <program plan code>`
- Ensured new Checkout sessions include this metadata in:
  - `subscription_data.metadata`
  - Top-level `metadata` (for debugging/traceability).
- Codified pattern of:
  - Stripe → Webhook → `program_subscriptions` → Billing UI.

