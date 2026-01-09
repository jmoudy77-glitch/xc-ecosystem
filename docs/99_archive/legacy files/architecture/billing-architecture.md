# Billing Architecture Overview
## XC-Ecosystem – Billing System Architecture
### Updated: 2025-12-01

This document outlines the complete billing architecture for the XC‑Ecosystem application, covering payment flows, data models, API endpoints, webhook processing, UI integration, and subscription synchronization between Stripe, Vercel, and Supabase.

---

# 1. High-Level Overview

The billing subsystem supports:
- **Program-level subscriptions** (college & high school programs)
- **(Future) Athlete-level subscriptions**
- **Stripe-based billing with monthly recurring plans**
- **Webhook-driven synchronization**
- **Full test-mode compatibility**
- **Future support for cancellation, proration, upgrades, and billing portal**

---

# 2. Stripe Components

## 2.1 Products & Prices
You have 9 subscription tiers:

### High School – Athlete Plans
- `hs_athlete_basic`
- `hs_athlete_pro`
- `hs_athlete_elite`

### High School – Program Plans
- `hs_starter`
- `hs_pro`
- `hs_elite`

### College – Program Plans
- `college_starter`
- `college_pro`
- `college_elite`

Each plan maps to a Stripe **Price ID** stored as environment variables:

```
STRIPE_PRICE_HS_ATHLETE_BASIC
STRIPE_PRICE_HS_ATHLETE_PRO
STRIPE_PRICE_HS_ATHLETE_ELITE
STRIPE_PRICE_HS_STARTER
STRIPE_PRICE_HS_PRO
STRIPE_PRICE_HS_ELITE
STRIPE_PRICE_COLLEGE_STARTER
STRIPE_PRICE_COLLEGE_PRO
STRIPE_PRICE_COLLEGE_ELITE
```

---

# 3. Billing Flow

## 3.1 Checkout Session Creation
A client component initiates checkout via:

```
POST /billing/create-checkout-session
```

The request includes:
- `scope` (`program` or `athlete`)
- `ownerId`
- `planCode`

The server:
- Validates the plan
- Looks up price ID
- Creates a Checkout Session with:
  - `metadata` → attached to the session
  - `subscription_data.metadata` → attached to the resulting subscription

### Example subscription metadata:
```json
{
  "scope": "program",
  "ownerId": "6252113e-0eb1-482f-8438-50415db05617",
  "planCode": "college_elite"
}
```

---

# 4. Webhook Processing

The webhook endpoint:

```
POST /api/stripe/webhook
```

Handles events:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

### 4.1 Signature Verification
Raw body is read using `req.text()` and verified against:

```
STRIPE_WEBHOOK_SECRET
```

### 4.2 Subscription Sync
The handler retrieves the subscription via:

```ts
stripe.subscriptions.retrieve(subscriptionId)
```

### 4.3 Metadata Extraction
Supports both naming formats:

```ts
ownerId  / owner_id
planCode / plan_code
scope
```

### 4.4 Upsert Logic
Correct table:
- `program_subscriptions` (for program scope)

Columns written:
- `program_id`
- `stripe_subscription_id`
- `stripe_customer_id`
- `status`
- `plan_code`
- `current_period_end`

Upsert uses:

```
ON CONFLICT (stripe_subscription_id)
```

---

# 5. Supabase Schema

## 5.1 program_subscriptions Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| program_id | uuid | FK → programs |
| stripe_customer_id | text | Stripe customer reference |
| stripe_subscription_id | text | **UNIQUE** |
| plan_code | text | One of 9 tier codes |
| status | text | active, trialing, canceled |
| current_period_end | timestamptz | Renewal |
| created_at | timestamptz | Default now() |

### 5.1.1 Required Constraints

```sql
ALTER TABLE public.program_subscriptions
ADD CONSTRAINT program_subscriptions_stripe_subscription_id_key
UNIQUE (stripe_subscription_id);
```

---

# 6. Billing UI Architecture

## 6.1 Client Components

### ProgramBillingPageClient
- Fetches program summary
- Reads subscription state
- Initiates checkout
- Opens customer portal
- Renders active plan
- Highlights current selection

### Program Summary API
```
GET /api/programs/[programId]/summary
```

Returns:
- Program info
- School info
- Most recent subscription

---

# 7. Environment Requirements (Vercel)

### Required Test Mode Keys
```
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...
```

### Required Price Variables
(As listed above)

---

# 8. Error Handling Behaviors

### Examples:
- Missing metadata → subscription ignored
- Signature failure → 400
- Missing price → 400 with message
- DB upsert failure (42P10) → requires constraint

---

# 9. Future Expansion

### Planned:
- Athlete-level subscriptions
- Proration handling
- Cancellations & downgrades
- Feature gating by plan
- Billing history UI
- Admin billing dashboard

---

# 10. Summary

This architecture now fully supports:
- Correct dynamic program billing routes
- Metadata-driven subscription scoping
- Database synchronization
- Stable production deployments
- End-to-end test-mode subscription flow

Everything is now in place to expand the billing subsystem with advanced features.

