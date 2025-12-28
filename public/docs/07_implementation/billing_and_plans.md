# Billing and Plans (Stripe)
**Authority Level:** Implementation Law (binding)  
**Purpose:** Document billing architecture, plan taxonomy, and integration responsibilities for Stripe-based subscriptions and entitlements.

---

## 1. Billing Thesis
Billing is not just payments; it is **entitlement truth**.
The platform must:
- keep subscription state authoritative and auditable
- enforce entitlements server-side
- separate program/org plans from athlete plans
- degrade gracefully when billing state is ambiguous

---

## 2. Plan Taxonomy (Canonical)
### 2.1 Program/Org Plans
These plans govern coach/program features:
- recruiting module access and capacity limits
- roster/scholarship tooling
- performance tooling depth
- meet management tooling
- storage quotas and staff seats (as configured)

### 2.2 Athlete Plans (Optional / Future)
These plans govern athlete-facing features:
- athlete profile visibility features
- athlete portal access (where enabled)
- AI report access (where enabled)

Rule: athlete plans never grant program/coach features.

---

## 3. Entitlements Model
Entitlements are derived from Stripe subscription state but stored as platform truth for fast enforcement.

Entitlement checks must occur:
- inside server actions (primary)
- reinforced by RLS where feasible (secondary)

Entitlements should include:
- feature flags
- limits (counts/quotas)
- seat constraints
- plan tier identifiers
- effective timestamps

---

## 4. Checkout Flow (Canonical)
1) user initiates checkout (server action)
2) create Stripe Checkout Session with correct scope metadata (program_id, user_id)
3) redirect user to Stripe
4) Stripe completes payment
5) webhook updates subscription + entitlements
6) UI reflects new entitlements

Rule: UI does not assume payment succeeded until webhook confirms.

---

## 5. Webhook Responsibilities (Canonical)
Webhook processing must:
- verify signature
- be idempotent
- map Stripe events to internal subscription state
- update entitlements
- write audit log entries for entitlement changes

Treat webhook as the authoritative state transition mechanism.

---

## 6. Metadata and Linking Requirements
Checkout and subscription records must carry enough metadata to link to:
- program/org scope
- user who initiated the purchase
- plan code / price id mapping
- environment (test vs live)

---

## 7. Failure Modes and Required Behavior
### 7.1 Payment succeeded but webhook delayed
- UI shows “Processing subscription” state
- system retries webhook processing
- do not grant entitlements early

### 7.2 Webhook failure
- alert/log with correlation id
- allow safe replay
- preserve raw event record where feasible

### 7.3 Subscription cancelled/expired
- entitlements must be downgraded promptly
- retain access to historical data per retention policy
- never delete domain truth as a billing side effect

---

## 8. Security Requirements
- never expose Stripe secret keys to client
- do not accept “plan tier” claims from client
- all plan enforcement is server-side

---

## 9. References
- `07_implementation/api_patterns.md`
- `07_implementation/service_responsibilities.md`
- `02_architecture/data_flow.md`
