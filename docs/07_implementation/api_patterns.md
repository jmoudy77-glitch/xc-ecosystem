# API Patterns
**Authority Level:** Implementation Law (binding)  
**Purpose:** Standardize API route conventions and clarify their limited responsibility in the architecture.

---

## 1. What API Routes Are For (and Not For)
API routes exist to serve:
- Stripe webhooks and billing callbacks
- external integrations (results ingestion, third-party callbacks)
- narrowly scoped public endpoints that cannot be implemented as server actions

API routes are not the home of domain business logic. They should **delegate** to internal services/server actions.

---

## 2. Canonical Route Responsibilities
A route handler may:
- verify signatures (webhooks)
- perform idempotency checks
- validate payload shape
- map integration payloads to internal command calls
- return integration-compatible responses (status codes, ack semantics)

A route handler must not:
- implement core domain rules
- perform sprawling multi-module writes
- bypass permissions or entitlements
- return sensitive data without strict scope enforcement

---

## 3. Idempotency (Non-negotiable for Webhooks)
Webhook handlers must be idempotent:
- dedupe by provider event id
- store processed events (or store run ids) to prevent double-processing
- design internal commands to be safe under retries

---

## 4. Authentication & Authorization
### 4.1 Webhooks
- Authenticate by signature verification (provider standard).
- No user context is assumed.
- Writes must use a dedicated service actor path with strict constraints.

### 4.2 User-facing routes (rare)
If a user-facing API route is required:
- authenticate the user
- validate tenant/program/team scope
- enforce role permissions and entitlements
- keep payload minimal

Prefer server actions for user-facing behavior.

---

## 5. Error Handling and Observability
- Return correct status codes; do not swallow errors.
- Log failures with correlation ids/run ids.
- For webhook failures, preserve enough context to replay safely.

---

## 6. Response Shape Conventions
- Use consistent JSON shapes for errors: `{ error: { code, message, details? } }`
- Include request ids for traceability when possible.
- Avoid returning internal stack traces to clients.

---

## 7. File/Folder Conventions (App Router)
- Route handlers live under `app/api/**/route.ts`
- Keep route handlers thin; call into server action/service modules.

---

## 8. Common Patterns
### 8.1 Stripe Webhook
1) verify signature  
2) parse event  
3) idempotency check  
4) dispatch to internal handler  
5) write entitlement changes + audit  
6) return 200 quickly

### 8.2 Results Ingestion Callback
1) authenticate source  
2) validate payload schema  
3) persist raw artifact (optional)  
4) map to internal “import results” command  
5) return ack + tracking id

---

## 9. Anti-Patterns
- “Business logic in route.ts” as the default implementation
- Using user session cookies inside webhook flows
- Returning large joined datasets from API routes
