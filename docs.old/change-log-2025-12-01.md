# XC-Ecosystem — Change Log
### Date: 2025-12-01

## Summary
This change log captures all structural, code-level, and infrastructure changes made today across routing, billing, webhook logic, database schema, and environment configuration.

---

## 1. Routing & Dynamic Params
- Updated dynamic route pages to await `params`:
  - `app/programs/[programId]/billing/page.tsx`
  - `app/programs/[programId]/page.tsx`
- Eliminated all cases where `programId` was undefined.
- Removed legacy billing UI routes under `/app/billing`.

---

## 2. Billing Client & UI Code
- Fixed button `disabled` prop typing:
  ```tsx
  disabled={!!(isBusy || isCurrent)}
  ```
- Updated ProgramBillingPageClient to prevent `res.json()` double-consumption.
- Cleaned useEffect loader logic for summary API fetch.

---

## 3. Stripe Integration
- Switched Vercel environment variables to **test mode keys**:
  - `STRIPE_SECRET_KEY`
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - `STRIPE_WEBHOOK_SECRET`
- Updated webhook metadata parsing to accept camelCase + snake_case.

---

## 4. Webhook Handler Updates
- Improved metadata extraction for:
  - `scope`
  - `ownerId` / `owner_id`
  - `planCode` / `plan_code`
- Added clearer error logging for missing metadata.
- Ensured subscription retrieval uses correct test-mode secret.

---

## 5. Database Schema
- Added UNIQUE constraint to program_subscriptions:
  ```sql
  ALTER TABLE public.program_subscriptions
  ADD CONSTRAINT program_subscriptions_stripe_subscription_id_key
  UNIQUE (stripe_subscription_id);
  ```

---

## 6. Cleanup
- Removed `page.legacy.tsx` and other obsolete files.
- Prevented legacy files from being picked up by Next.js compiler.

---

## Status
All billing, webhook, and subscription-sync pathways now operate correctly in test mode.  
System is ready for the next development phase.
