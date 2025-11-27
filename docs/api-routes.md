# API Routes (Next.js App Router)

## Health / Test Routes

### `GET /api/supabase-test`
- Purpose: Test Supabase connectivity
- Returns: `{ ok: boolean, data?: any, error?: string }`

### `GET /api/stripe-test`
- Purpose: Test Stripe connectivity (list products)
- Returns: `{ ok: boolean, products?: any, error?: string }`

### `GET /api/ai-test`
- Purpose: Test OpenAI connectivity
- Returns: `{ ok: boolean, reply?: string, error?: string }`

## Planned Routes (Day 2+)

### `POST /api/checkout/session`
- Create Stripe Checkout session for subscriptions.

### `GET /api/recruits`
- List recruits for the current organization.

### `POST /api/recruits`
- Create a new recruit.

### `PATCH /api/recruits/:id`
- Update recruit fields (status, notes, etc.).

