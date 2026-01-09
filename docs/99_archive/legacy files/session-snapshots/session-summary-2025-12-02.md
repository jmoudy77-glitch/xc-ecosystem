# XC-Ecosystem — Session Summary
### Date: 2025-12-02

This session continued from the prior billing + routing work and consolidated everything into a clean, stable foundation for the app. It also incorporates the earlier **Session Snapshot Summary** you provided at the start of this thread, which captured:

- The struggle around Next.js cookie APIs and Supabase SSR helpers
- The `supabaseServer.ts` iterations to fix `req.cookies.get` / `cookies().get` issues
- The early implementation of scoring routes and UI
- Initial stabilization of `/api/me`, dashboard, and removal of stale `organizations` references

That prior snapshot represents the **pre-billing/staff foundation**. Today’s work builds directly on top of that state.

---

## 1. High-Level Outcomes

- Dark-themed UI now consistent across **layout, dashboard, billing, and staff pages**.
- **Team Management** (program staff) is fully functional:
  - List staff
  - Update staff roles
  - Remove staff from a program
- **Program-level Stripe billing** is now working end-to-end:
  - Checkout and customer portal wired to the program
  - Stripe → Webhook → Supabase → Billing UI all in sync
- Next.js 16 route handler / `params` changes are fully handled with a robust pattern.
- Database constraints updated to support clean `upsert` of subscriptions.

---

## 2. UI & Layout Changes

### 2.1 Global Root Layout

- Implemented `app/layout.tsx` as a **dark global shell**:
  - Top nav with:
    - Dashboard
    - Coach Onboarding
    - Athlete Onboarding
    - Program Billing Debug
  - Shared container (`max-w-6xl`) and padding
  - `bg-slate-950` / `slate-900` palette + backdrop blur

This replaces ad-hoc per-page headers and gives a unified feel.

### 2.2 Dark Dashboard

- `app/dashboard/page.tsx` restyled to match the billing page:
  - Dark background and card styling
  - “Account” card showing user info and role hint
  - “Athlete subscription” card showing plan, status, and renewal
  - “Programs” section listing all programs attached to the coach
    - Buttons:
      - **Overview** → `/programs/[programId]` (future)
      - **Team** → `/programs/[programId]/staff`
      - **Manage billing** → `/programs/[programId]/billing`

Dashboard now cleanly reflects `/api/me` in a production-ready layout.

### 2.3 Dark Program Billing Page

- Upgraded `app/programs/[programId]/billing/page.tsx` to:
  - Display current plan, status, and renewal date
  - Present selectable plan options:
    - `college_starter`
    - `college_pro`
    - `college_elite`
  - Provide two main actions:
    - **Activate / Change plan in Stripe** (Checkout)
    - **Open Stripe customer portal**

---

## 3. Team Management (Program Staff)

### 3.1 Staff List API

**Route:**

- `GET /api/programs/[programId]/staff`

Behavior:

- Verifies that the authenticated user is a member of the given program via `program_members`.
- Selects staff from `program_members` joined to `users`:
  - `id`
  - `user_id`
  - `role`
  - `email`
  - `created_at` as `joinedAt`

### 3.2 Staff Member Actions API

**Route:**

- `PATCH /api/programs/[programId]/staff/[memberId]`
- `DELETE /api/programs/[programId]/staff/[memberId]`

Key details:

- We **do not** rely on `params` from the handler context (Next.js 16 made `params` a `Promise`), so we:
  - Parse `programId` and `memberId` directly from the URL segments.
- `PATCH`:
  - Validates membership via `program_members`.
  - Updates `role` for that `memberId` + `programId`.
- `DELETE`:
  - Validates membership.
  - Deletes the `program_members` row.

### 3.3 Staff Management UI

**Route:**

- `app/programs/[programId]/staff/page.tsx`

Features:

- Dark theme, matching global layout.
- Staff table with columns:
  - Email
  - Role (editable via `<select>`)
  - Joined date
  - Remove button
- Actions:
  - Changing role calls `PATCH /api/programs/[programId]/staff/[memberId]`.
  - Remove calls `DELETE /api/programs/[programId]/staff/[memberId]`.
- Includes a disabled “Invite staff (coming soon)” button for future work.

Team Management is now a complete, working module.

---

## 4. Stripe Billing — Program-Level (Org) Flow

### 4.1 Checkout Integration

**Client:**

- `app/programs/[programId]/billing/page.tsx` posts to:

```ts
POST /billing/create-checkout-session
{
  scope: "org",
  ownerId: programId,
  planCode: "<program plan code>"
}
```

**Server (conceptual):**

- `app/billing/create-checkout-session/route.ts` now:
  - Matches `planCode` → Stripe price.
  - Creates a subscription-mode Checkout session.
  - Most importantly, attaches:

```ts
subscription_data: {
  metadata: {
    scope: "org",
    owner_id: programId,
    plan_code: planCode,
  },
},
metadata: {
  scope: "org",
  owner_id: programId,
  plan_code: planCode,
},
```

This metadata is later consumed by the webhook.

### 4.2 Customer Portal Integration

**Client:**

- Billing page calls:

```ts
POST /billing/create-portal-session
{
  scope: "org",
  ownerId: programId
}
```

**Server:**

- `app/billing/create-portal-session/route.ts` uses:
  - `scope: "org"`
  - `ownerId: programId`
  - To look up the Stripe customer id and create a portal session.

---

## 5. Stripe Webhook — Finalized

**Route:**

- `app/api/stripe/webhook/route.ts`

Key changes:

1. **No explicit `apiVersion`** in `new Stripe(...)` to avoid TS conflicts with your installed Stripe types.
2. Handles:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
3. Reads metadata from the Subscription:

```ts
const metadata = subscription.metadata || {};
const scope = (metadata.scope as "org" | "athlete" | undefined) ?? "org";
const ownerId = metadata.owner_id;
const planCode = (metadata.plan_code as string | undefined) ?? null;
```

4. If `owner_id` is missing, logs a warning and skips the event (this caught earlier misconfigured sessions).

5. Uses helpers:

- `upsertSubscriptionRecord(...)`
- `markSubscriptionCanceled(...)`

which now:

- For `scope: "org"`:
  - Write to `program_subscriptions` with `program_id`.
- For `scope: "athlete"` (future use):
  - Write to `athlete_subscriptions` with `athlete_id`.

6. `current_period_end`:

- Accessed via `(subscription as any).current_period_end` to satisfy TypeScript.
- Converted from UNIX seconds to ISO datetime before storing.

---

## 6. Database Changes

### 6.1 Unique Constraint for Program Subscriptions

To support clean upsert behavior, we added:

```sql
ALTER TABLE public.program_subscriptions
ADD CONSTRAINT program_subscriptions_program_id_key
UNIQUE (program_id);
```

This resolved the Postgres error:

```text
42P10: there is no unique or exclusion constraint matching the ON CONFLICT specification
```

Now, each program has at most one row in `program_subscriptions`, and the webhook’s:

```ts
.upsert(payload, { onConflict: "program_id" })
```

works as intended.

---

## 7. State at End of Session

All of the following are working and have been test-verified:

- **Auth + `/api/me`**
- **Dashboard page**, dark theme, uses `/api/me`:
  - Shows user and role
  - Program list with links to Overview, Team, Billing
- **Team Management**:
  - Staff list
  - Role updates
  - Remove staff member
- **Program Billing page**, dark theme:
  - Reads `program_subscriptions`
  - Shows plan, status, renewal
  - Stripe Checkout + Portal buttons both functional
- **Stripe Webhook**:
  - Valid signature
  - Events processed
  - Writes to `program_subscriptions`
- **Next.js 16 compatibility**:
  - No more `params` type errors in route handlers
  - Build passes cleanly in Vercel

---

## 8. Design / Roadmap Note

You explicitly noted for future beta:

> Beta version to include custom color styling and graphics based on school.

This is now treated as a tracked UX requirement:

- Each program will eventually have:
  - Primary / secondary / accent colors
  - Logo & background
  - Per-program theming for dashboard, billing, and team screens.

Implementation is deferred to a later “branding system” milestone.

---

## 9. Suggested Next Steps

When development resumes, strong next candidates are:

1. **Program Overview Page** at `/programs/[programId]`:
   - Surface key data: roster count, board activity, staff, billing status.

2. **Roster Management**:
   - `roster` table & API
   - Roster UI for athletes per program.

3. **Recruiting Board MVP**:
   - Basic board, stages, notes, and future AI hooks.

4. **Staff Invitations**:
   - Email-based invites tied to `program_members`.
