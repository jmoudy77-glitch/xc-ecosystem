# Day 3 – Architecture Build & Setup

**Date:** 2025-11-27  
**Branch:** `day-3-architecture`

## 1. Where we left off (end of Day 2)

- Stripe Checkout routes implemented:
  - [x] Upgrade to Elite flow working in UI.
  - [x] Created Stripe Checkout session backend route.
  - [ ] Webhook fully validated and integrated into subscription logic (in progress).
- Core stack:
  - [briefly list: e.g., Next.js API routes, Postgres via Prisma, Auth provider, etc.]

## 2. Today’s primary goals (Day 3)

1. Lock in v1 relational schema for core recruiting objects:
   - Users, Programs, Teams/EventGroups, Athletes, RecruitingBoards, Pipeline, Activities, AISnapshots.
2. Implement first real API endpoints for:
   - Program & team management.
   - Athlete CRUD + filters.
   - Recruiting boards + pipeline stage updates.
3. Wire basic app shell + UI pages:
   - Athlete list, athlete detail, recruiting board (Kanban-style).
4. Define AI service contracts + stub implementation:
   - AIScoutScore, CommitProbability, NextAction, Explanation.

## 3. Known issues / open loops

- Stripe webhook 401 from Vercel previously:
  - Need to double-check: 
    - Webhook endpoint URL.
    - Stripe signing secret in env vars.
    - Route is not behind auth middleware.
- Multi-program support:
  - For now, starting with single program (e.g., WCU Men’s Track & Field), but schema must be multi-program ready (`program_id` everywhere).
- AI:
  - No real model yet. Day 3 will define contracts + mock scoring.

## 4. End-of-day definition of done (DOD)

- Can:
  - Create a team/event group attached to the program.
  - Create athletes and view them in a filterable list.
  - Open an athlete detail with pipeline stage and recent activities.
  - Open at least one recruiting board and move athletes between stages.
  - Hit an AI scoring endpoint that returns a mocked AISnapshot.
- Stripe:
  - Subscription record created/updated on successful webhook.
  - Feature flag hook in place (e.g., `canUseAI` based on subscription tier).
