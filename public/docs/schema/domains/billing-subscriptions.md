# Billing & Subscriptions Schema

Covers Stripe integration, program billing, and athlete billing.

---

## 1. Program Billing

### 1.1 `program_subscriptions`

- `program_id` (unique)
- `stripe_customer_id`
- `stripe_subscription_id`
- `plan_code`
- `status`
- `current_period_end`
- `cancel_at_period_end`

Represents the billing state of a single program.

---

## 2. Athlete Billing

### 2.1 `athlete_subscriptions`

- `user_id` (unique)
- `plan_code`
- `status`
- Stripe IDs
- Period end, cancel flags

Represents subscription for an athlete’s personal premium tools (future).

---

## 3. Users Table Integration

`users` contains additional Stripe fields for single-seat billing.

---

## 4. RLS

- Billing rows visible only to program admins or the user themselves (for athlete plans).
- Stripe webhooks operate with service role.

