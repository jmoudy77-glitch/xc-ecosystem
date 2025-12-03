/docs/system-architecture.md

System Architecture — Version 2.0

Last Updated: YYYY-MM-DD

The Recruiting Ecosystem is a unified, multi-sport coaching, recruiting, and athlete development platform designed to elevate both high school and college coaching environments.

It integrates:
	•	Recruiting CRM
	•	Athlete data & analytics
	•	Program & roster management
	•	High school coaching tools & knowledge base
	•	AI-driven training, evaluation, and decision support
	•	Stripe-based subscription management at both org and individual levels

This document defines the architecture, core modules, cross-cutting services, and system goals for the platform as of Version 2.0.

⸻

1. Vision & Purpose

The system exists to:
	•	Elevate high school coaching quality, closing the gap between amateur and professional coaching
	•	Improve athlete outcomes using structured tools, data, and AI
	•	Streamline college recruiting, providing clarity, efficiency, and intelligence
	•	Unify roster, training, and program operations across all sports
	•	Serve as a coaching intelligence system, not just a CRM or roster platform

The platform ties together coaches → athletes → data → AI → decision-making, creating a single ecosystem for player development and recruiting pipelines.

⸻

2. Core Pillars

Version 2.0 includes five major pillars, each represented in schema, API routes, UI, and permissions:

⸻

2.1 Recruiting & Pipeline Intelligence

A complete CRM-style recruiting engine with:
	•	Recruiting boards (drag-and-drop)
	•	Pipeline stages
	•	AI scout scores
	•	AI commit probability
	•	Athlete comparisons
	•	Priority flags & tagging
	•	Batch operations
	•	Notes, evaluations & structured assessments
	•	Scholarship impact forecasting

This pillar serves college coaches primarily, but HS coaches can leverage pipeline tools to track post-secondary opportunities for their athletes.

⸻

2.2 Program, Team & Roster Management

Tools for operational oversight:
	•	Organization profiles
	•	Multi-sport programs (Track & Field to start)
	•	Teams / event-groups (Sprints, Distance, Throws, Jumps)
	•	Rosters
	•	Depth charts (drag-and-drop)
	•	Academic & eligibility statuses
	•	Athlete contact + profile management

All team objects map directly to schema-level tables and RLS-scoped permissions.

⸻

2.3 Athlete Data & Development Analytics

A unified athlete engine that stores:
	•	PRs & performance histories
	•	Longitudinal charts
	•	Testing data (e.g., 30m fly, vertical jump)
	•	Progression modeling
	•	Training logs
	•	Video references
	•	Analytics summaries powered by AI

This pillar powers both HS and college contexts.

⸻

2.4 High School Coaching Advancement (New Major Pillar)

A defining purpose of the platform is raising the effectiveness of amateur coaches.

This pillar includes:

A. Coaching Tools
	•	Season planning
	•	Practice planning
	•	Training-cycle visualizer (macro/micro)
	•	Attendance & training load
	•	Workout templates
	•	Strength & conditioning basics
	•	Athlete development dashboards

B. Coaching Knowledge Base
	•	Drill libraries
	•	Warm-up + mobility structures
	•	Technique teaching guides
	•	Event-group fundamentals
	•	Coaching philosophy & frameworks
	•	Video + article content

C. AI Coaching Assistant
	•	AI-generated practice plans
	•	AI critique of athlete training patterns
	•	AI “next intervention” suggestions
	•	Technique recommendations
	•	Risk/overuse warnings
	•	Event-specific training optimization

This pillar directly improves the HS → College athlete pipeline.

⸻

2.5 AI Intelligence Layer (Cross-Cutting)

AI is not a “future add-on.”
It is now a core cross-cutting service touching:
	•	recruiting intelligence
	•	athlete development
	•	coaching recommendations
	•	training plan generation
	•	roster analysis
	•	performance explanations

It operates through dedicated endpoints (server-side only) with:
	•	ai_scout_scores
	•	ai_commit_estimates
	•	ai_recommendations

and contextual modeling based on user role (coach, HS coach, athlete).

⸻

3. User Personas

The system supports four primary personas:

College Coaches

Use the platform for roster management, recruiting intelligence, and pipeline forecasting.

High School Coaches

A central persona.
Use coaching tools, plans, knowledge base, athlete development dashboards, and limited recruiting tools.

High School Athletes

Use the platform to manage profiles, view progress, and share data with coaches.

College Athletes

Use for team communication, training logs, progress tracking, and testing dashboards.

⸻

4. System Architecture Overview

Below is the high-level architecture.

⸻

4.1 Frontend Architecture

Built with Next.js (App Router):
	•	React Server Components
	•	Server Actions for safe DB access
	•	Edge runtime support for fast interactions
	•	ShadCN UI + Tailwind for consistent styling

Key UI concepts:
	•	Left-side navigation
	•	Context-aware dashboards
	•	Drag-and-drop interactions
	•	Mobile-friendly variants
	•	Mild animations for clarity (non-distracting)
	•	Coach and athlete experiences adapt based on role

⸻

4.2 Backend Architecture

Supabase (Primary Backend)
	•	Postgres with RLS
	•	Auth (email, OAuth)
	•	Postgres functions & triggers
	•	Storage for media
	•	Real-time subscriptions (future)

Stripe (Billing)
	•	Checkout Sessions
	•	Customer Portal
	•	Webhooks → update subscription state
	•	Org-level and athlete-level subscription models

OpenAI / LangChain
	•	AI scoring
	•	AI summaries
	•	Training plan generation
	•	Coach instruction assistance

All AI interactions run through backend-only endpoints.

⸻

5. Core Modules

⸻

5.1 Recruiting Module
	•	Boards
	•	Stages
	•	Cards
	•	Batch ops
	•	Tagging
	•	Notes
	•	Evaluations
	•	AI integration
	•	Pipeline analytics

Backed by recruiting schema tables.

⸻

5.2 Program + Team Module
	•	Org → Program → Team → Roster hierarchy
	•	Event-groups
	•	User program membership
	•	Coach roles and permissions

⸻

5.3 Athlete Module
	•	Profile
	•	Performance
	•	Tests
	•	Video library
	•	Analytics
	•	Training logs

Connected to HS and college workflows.

⸻

5.4 HS Coaching Tools Module
	•	Season plans
	•	Practice plans
	•	Blocks
	•	Attendance
	•	Knowledge base

Key differentiator for product value.

⸻

5.5 Billing Module

Two distinct subscription tables:
	•	org_subscriptions
	•	athlete_subscriptions

All billing logic runs through Stripe and webhook syncing.

Scopes:
	•	Org scope: coach-facing plans (Starter, Pro, Elite)
	•	Athlete scope: athlete plans (Basic, Pro, Elite)

⸻

5.6 AI Module
	•	All AI logic encapsulated server-side
	•	Stateless inference, state saved in tables
	•	Results cached for quick UI load
	•	Interfaces with athlete, HS coaching, and recruiting workflows

⸻

6. Data Architecture

See /docs/schema.md (Version 2.0) for full table details.

High-level domains:
	1.	Users & Orgs
	2.	Programs & Teams
	3.	Athletes & Performance
	4.	Recruiting
	5.	HS Coaching
	6.	AI Models
	7.	Billing

All interconnected via foreign keys and governed by RLS.

⸻

7. API Architecture

API routes follow domain segmentation:
	•	/api/me — identity + role + billing context
	•	/api/auth/ — session
	•	/api/recruiting/ — boards, pipeline, batch ops
	•	/api/athletes/ — roster & performance
	•	/api/orgs/ — org/program/team data
	•	/api/coach-tools/ — season/practice/knowledge base
	•	/api/ai/ — AI-backed inference
	•	/billing/ — checkout + portal
	•	/api/stripe/webhook — subscription state sync

See /docs/api-routes.md for the full route map.

⸻

8. Permissions & Security

Row-Level Security (RLS)

All tables are protected by RLS.
Key rules:
	•	Users may only see or update their own row in users.
	•	Coaches must be org members to view or mutate any org/team/athlete data.
	•	Athletes can only see their own athlete profile + training logs.
	•	Recruiting data is restricted to coaching roles.
	•	Billing tables are accessible only to the appropriate scope (org or athlete).

API Auth

All routes use Supabase Auth session derived in server components.
Billing webhooks use Stripe signature validation.

⸻

9. Cross-Cutting Services

AI Interpretation
	•	Athlete summaries
	•	Practice generation
	•	Recruiting intelligence
	•	HS coaching assistance

File Storage
	•	Athlete videos
	•	Drill videos
	•	Media used in knowledge base
	•	Practice plan attachments (future)

Analytics
	•	PR charts
	•	Development curves
	•	Class/prospect distribution
	•	Team readiness
	•	Scholarship projections

⸻

10. Roadmap Alignment

Version 2.0 supports:

Phase 1 (Core)

Recruiting, roster, HS coaching basics, billing, identity.

Phase 2 (Expansion)

Deeper analytics, advanced HS tools, full AI integration.

Phase 3 (Optional Modules)

Equipment tracking, multi-sport expansion, external data sources.

⸻

11. Change Log

2025-12-30 — Version 2.0 (Current)
	•	Added High School Coaching Elevation as major pillar
	•	Added AI Intelligence Layer as core architecture element
	•	Updated billing model → org_subscriptions + athlete_subscriptions
	•	Expanded schema and API sections
	•	Updated program/team/roster descriptions
	•	Harmonized architecture with schema + API docs (Versions 2.0)
	•	Rewrote entire file for clarity and accuracy

2025-11-29 — Version 1.0
	•	Initial architectural outline