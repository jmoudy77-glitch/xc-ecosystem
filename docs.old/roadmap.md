# Product Roadmap (High-Level)

## Phase 1 – Core Ecosystem (MVP+)

**Goals:**
- Deliver an end-to-end usable system for:
  - College recruiting
  - Basic HS & college roster management
  - Simple HS coaching tools
- Integrate Stripe + Supabase for real billing and auth.

**Scope:**
1. Auth & Account
   - Supabase auth
   - `/api/me`
   - Basic `users`, `orgs`, `org_memberships`

2. Roster & Teams
   - Org and team management
   - Athletes table, basic athlete profile
   - Roster views

3. Recruiting Core
   - Recruiting board (single board per team/org)
   - Stages, drag & drop
   - Basic notes, tags
   - Batch tagging and stage changes

4. HS Coaching Foundations
   - Season plan skeleton
   - Practice plan creation (simple, no complex cycles)
   - Knowledge base MVP (hard-coded or minimal CMS)

5. Billing
   - Stripe Checkout
   - Org and athlete scope
   - Webhook updating `org_subscriptions` and `athlete_subscriptions`
   - Basic paywalling by planCode

6. AI Basics
   - AI athlete summary
   - AI scout score (simple first-pass model)
   - AI practice plan V1 (text output)

---

## Phase 1.5 – UX & Reliability Pass

**Goals:**
- Smooth out primary flows.
- Improve perceived quality.

**Scope:**
- UI polish:
  - Mild animations
  - Hover states
  - Loading skeletons
- Error handling:
  - Better `/api/me` handling
  - Webhook logging
- Drag & drop refinements
- Batch operation refinements
- Basic analytics widgets on dashboard

---

## Phase 2 – HS Coaching Elevation & Deeper Analytics

**Goals:**
- Fully lean into the HS coaching pillar.
- Provide robust training and coaching tools.

**Scope:**
1. HS Coaching:
   - Full season planning (macro/micro cycles)
   - Practice block templates
   - Attendance & load tracking with charts
   - Expanded knowledge base (more items, event-specific depth)

2. Athlete Data:
   - Detailed performance history
   - Testing module
   - Visualization dashboards for athlete progression

3. AI Enhancements:
   - AI readiness feedback (based on training logs)
   - AI drill recommendations
   - AI commit probability with more context

4. Analytics:
   - Recruiting funnel analytics
   - Scholarship projection dashboards

---

## Phase 3 – Expansion & Optional Modules

**Goals:**
- Broaden product surface and monetization.
- Improve ecosystem stickiness.

**Potential Scope (modular / optional):**
- Equipment tracking
- External data integrations (meet results, ranking lists)
- Mobile app or PWA with offline-friendly logging
- Advanced multi-sport support
- More sophisticated admin tooling

---

## Guiding Principle

Each phase should:
- Preserve backward compatibility where possible.
- Build on existing pillars (not tack on disconnected modules).
- Reinforce the mission of:
  - elevating HS coaching,
  - improving athlete development,
  - and empowering recruiting intelligence.