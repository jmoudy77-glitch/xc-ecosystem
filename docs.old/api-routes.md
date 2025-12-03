Recruiting Ecosystem — API Routes

Version: 2.0
Last Updated: YYYY-MM-DD

This document is the canonical map of all REST API endpoints in the Recruiting Ecosystem.
It defines paths, methods, auth requirements, request/response shapes, and side effects.

All routes are implemented using Next.js App Router under app/api/.../route.ts and use Supabase Auth for identity and Supabase Postgres for data persistence.

⸻

1. Conventions
	•	Base URL (dev): http://localhost:3000
	•	Base URL (prod): <your-vercel-deployment-url>
	•	Auth: Supabase JWT (httpOnly cookies)
	•	Errors:
	•	Returned as { "error": "Message" }
	•	With appropriate HTTP status codes
	•	RLS: All DB writes/reads respect Supabase Row Level Security where required.
	•	Scope: Many routes differ based on whether the user is a Coach, HS Coach, or Athlete.

⸻

2. Auth & Identity

2.1 GET /api/auth/session

File: app/api/auth/session/route.ts
Auth: Required

Purpose: Return Supabase-authenticated session context.

Response:
{
  "userId": "uuid",
  "email": "coach@example.com",
  "roles": ["coach"],
  "orgMemberships": [...],
  "sessionActive": true
}
2.2 GET /api/me

File: app/api/me/route.ts
Auth: Required

Purpose:
Return the full account context used throughout the application, including:
	•	user row from DB
	•	resolved role: "coach" or "athlete"
	•	primary org/team context
	•	subscription state (org or athlete scope)
	•	feature access gates

Behavior:
	•	If no DB user row exists, attempts to create one (RLS-safe).
	•	Serves as the single source of truth for front-end state.

⸻

2.3 PATCH /api/me

Purpose: Update user display name, default org, preferences.

⸻

3. Billing & Stripe Integration

3.1 POST /billing/create-checkout-session

File: app/billing/create-checkout-session/route.ts
Auth: Required

Purpose:
Creates a Stripe Checkout Session for either:
	•	an org-level subscription (coach billing scope)
	•	an athlete-level subscription (individual scope)

Request Body:
type CheckoutBody = {
  scope: "org" | "athlete";
  ownerId: string;      // org_id or user_id
  planCode: PlanCode;
};
{
  "url": "https://checkout.stripe.com/c/session_id..."
}
Notes:
	•	Maps planCode → Stripe Price ID.
	•	Does not update DB directly; webhook handles subscription updates.

⸻

3.2 POST /billing/create-portal-session

Creates a Stripe Customer Portal session for managing billing.

⸻

3.3 POST /api/stripe/webhook

File: app/api/stripe/webhook/route.ts
Auth: Stripe signature verification

Purpose:
Listen for Stripe events to synchronize subscription state into:
	•	org_subscriptions
	•	athlete_subscriptions

Events handled:
	•	checkout.session.completed
	•	customer.subscription.created
	•	customer.subscription.updated
	•	customer.subscription.deleted

Behavior:
	•	Validates signature
	•	Reads metadata: scope, ownerId, planCode
	•	Upserts subscription row
	•	Updates fields: status, current_period_end, cancel_at_period_end, etc.

Response:
Always return 200 on success to avoid Stripe retries.

⸻

4. Organizations, Programs & Teams

4.1 GET /api/orgs

Returns orgs user is a member of.

⸻

4.2 POST /api/orgs

Create a new organization/program.

⸻

4.3 GET /api/teams

Returns event-groups / teams for the selected org.

⸻

4.4 POST /api/teams

Create a new team/event-group.

⸻

5. Roster & Athlete Management

5.1 GET /api/athletes

Purpose:
Returns athletes in the active org/team.

Filters:
	•	teamId
	•	gradYear
	•	eventGroup
	•	tag
	•	status

⸻

5.2 POST /api/athletes

Create an athlete record (HS or college context).

⸻

5.3 GET /api/athletes/{id}

Returns full athlete profile:
	•	Bio
	•	PRs
	•	Performance history
	•	Videos
	•	Notes/tags

⸻

5.4 PATCH /api/athletes/{id}

Updates athlete profile fields.

⸻

5.5 GET /api/athletes/{id}/performance

Returns detailed performance metrics, testing data, and chart source.

⸻

6. Recruiting & Pipeline Intelligence

6.1 GET /api/recruiting/board

Purpose:
Main recruiting board view.

Response includes:
	•	stages/columns
	•	cards/recruits with summary
	•	AI scout + commit probability

⸻

6.2 PATCH /api/recruiting/board/reorder

Handles drag-and-drop operations:
	•	Moving recruits between stages
	•	Reordering within a stage

⸻

6.3 POST /api/recruiting/board/batch

Batch operations:
	•	multi-tagging
	•	stage changes
	•	priority flags
	•	assign to event-group
	•	bulk notes

⸻

6.4 GET /api/recruiting/pipeline

Pipeline summaries:
	•	recruits per stage
	•	AI commit rollups
	•	scholarship impact projections
	•	class-size vs targets

⸻

7. High School Coaching Tools (Core Pillar)

7.1 GET /api/coach-tools/seasons

Return season plans for HS or college teams.

⸻

7.2 POST /api/coach-tools/seasons

Create season plan with macro-cycle structure.

⸻

7.3 GET /api/coach-tools/practices

Return practice plans for a date range.

⸻

7.4 POST /api/coach-tools/practices

Create or duplicate a practice plan.

⸻

7.5 PATCH /api/coach-tools/practices/reorder

Drag-and-drop block editing.

⸻

7.6 GET /api/coach-tools/knowledge-base

Return coaching education items:
	•	drills
	•	progressions
	•	technique articles/videos
	•	categories

Filters:
	•	eventGroup
	•	topic
	•	level

⸻

8. AI Assistant Endpoints

8.1 POST /api/ai/scout-score

Returns:
	•	numeric scout score
	•	explanation

⸻

8.2 POST /api/ai/commit-probability

Returns likelihood of commitment + suggested actions.

⸻

8.3 POST /api/ai/practice-plan

Generates AI-driven practice session templates.

⸻

8.4 POST /api/ai/athlete-summary

Summarizes an athlete in natural language.

⸻

9. Utilities & Internal

9.1 GET /api/health

Health check endpoint.

⸻

9.2 GET /api/admin/overview

Restricted.
Internal metrics.

⸻

10. Change Log

2025-11-29 — Version 1.0

Initial API map created.
Included:
	•	/api/me
	•	Billing routes
	•	Stripe webhook
	•	Partial recruiting roster routes
** ￼**

2025-12-30 — Version 2.0

Full rewrite aligned with updated system architecture:
	•	Added HS Coaching Tools routes
	•	Added AI endpoints
	•	Added Recruiting Pipeline routes
	•	Aligned billing to org/athlete scopes
	•	Reorganized file into major product pillar sections
	•	Updated all request shapes and responses