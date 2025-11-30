/docs/system-architecture.md

System Architecture Overview

The College Recruiting Ecosystem is a unified athletic management platform designed to advance the effectiveness of high school and college coaches, enhance athlete development, and streamline recruiting workflows. It integrates CRM-style recruiting tools, roster and program management, athlete data analytics, coaching education resources, and AI-driven intelligence into a single cohesive system.

This document outlines the system’s core pillars, personas, capabilities, architecture, and high-level functionality.

⸻

1. Vision & Purpose

The system exists to:
	•	Modernize and unify athletic program operations
	•	Improve athlete outcomes through data, structure, and coaching tools
	•	Elevate high school coaching effectiveness
	•	Give college coaches deep intelligence and efficient recruiting workflows
	•	Provide AI-driven insights across training, evaluation, and team management
	•	Maintain a seamless athlete journey from high school → college → performance tracking
	•	Deliver premium tools across both web and mobile contexts

The ecosystem is designed for Track & Field initially, with modular structures enabling expansion to all sports.

⸻

2. Core User Personas

2.1 College Coaches

Roles include:
	•	Head Coach
	•	Assistant Coach
	•	Recruiting Coordinator
	•	Analyst
	•	Graduate Assistant

Responsibilities revolve around recruiting strategy, roster management, scholarship planning, and event-group analysis.

⸻

2.2 High School Coaches (Major Pillar Persona)

A foundational goal is closing the gap between amateur and professional coaching.
High school coaches rely on simplified structures, education, templates, and AI guidance.

Needs include:
	•	Practice planning
	•	Training progression models
	•	Athlete progress monitoring
	•	Technical instruction
	•	Drill libraries and knowledge base
	•	AI-driven recommendations for training, adjustments, and athlete development

This directly improves the athlete pipeline.

⸻

2.3 High School Athletes

Use the platform to:
	•	Manage profiles
	•	Track performance data
	•	Log training
	•	Share videos and academic data
	•	Improve recruitability

⸻

2.4 College Athletes

Use the platform for:
	•	Team communication
	•	Practice logs
	•	Performance tracking
	•	Testing results
	•	Development monitoring

⸻

3. Core Pillars of the Ecosystem

3.1 Recruiting & Pipeline Intelligence

Central CRM and evaluation engine featuring:
	•	Recruiting boards
	•	Pipeline stages
	•	AI scout scores
	•	Commit probability models
	•	Athlete interest indicators
	•	Priority ranking
	•	Notes, tags, evaluations
	•	Drag-and-drop workflows
	•	Batch operations
	•	Automated reminders and next-step prompts

⸻

3.2 Program, Team & Roster Management

Comprehensive tools for program oversight:
	•	Multi-program support
	•	Roster lists with athlete roles
	•	Depth charts
	•	Event-group grouping
	•	Scholarship allocation tracking
	•	Academic/eligibility status
	•	Team dashboards
	•	Animated drag/drop interfaces

⸻

3.3 Athlete Data & Development Analytics

Unified athlete performance engine:
	•	PRs and event histories
	•	Performance charts
	•	Longitudinal development graphs
	•	Video uploads (technique analysis)
	•	Testing logs
	•	Daily/weekly progression logs
	•	AI trend explanations and developmental insights

⸻

3.4 High School Coaching Advancement (Formal Pillar)

A core differentiator of the ecosystem is to elevate HS coaching effectiveness.

A. Coaching Tools
	•	Season planners
	•	Practice builders
	•	Workout templates
	•	Strength & conditioning tools
	•	Training cycle visualizer
	•	Athlete workload management
	•	Attendance and accountability
	•	Multi-sport athlete tools

B. Coaching Knowledge Base
	•	Drill libraries
	•	Training progressions
	•	Technical instruction (video + written)
	•	Event-specific fundamentals
	•	Warmups and mobility programs
	•	Coaching philosophy and methodology guides

C. AI Coaching Assistant
	•	AI practice plan builder
	•	AI technique suggestions
	•	“If athlete X has pattern Y → recommended intervention Z”
	•	Training/load adjustments
	•	Competition prep tools
	•	Injury risk warnings
	•	Athlete development projections

This pillar significantly improves the HS-to-college athlete pipeline.

⸻

3.5 AI Intelligence Layer

AI integrates across all major modules:
	•	AI scout score
	•	AI commit probability
	•	AI next action
	•	AI training plan builder
	•	AI summaries of athlete profiles
	•	AI strengths/weakness analysis
	•	AI athlete comparison tools
	•	AI event-group insights
	•	AI readiness & wellness interpretation

Context-aware responses vary by user role (HS coach vs. college coach vs. athlete).

⸻

3.6 Financial Tools (Program-Facing Only)

Phase 1 includes:
	•	Scholarship budgeting
	•	Recruiting class projections
	•	Roster financial planning
	•	Equivalency charts

Booster club modules are intentionally excluded.

⸻

3.7 Subscription, Access & Billing (Stripe Integration)

The platform uses role-based, scope-driven access:

Scopes
	•	org (program-level billing)
	•	athlete (individual billing)

Features
	•	Tiered subscriptions (Starter, Pro, Elite)
	•	HS and college plan variants
	•	Stripe Checkout Sessions
	•	Stripe Customer Portal
	•	Webhooks automatically updating user/org subscription state in Supabase
	•	Server-side RLS enforcement
	•	Single login with role-dependent UI behavior
	•	Auto-detection of whether user is coach or athlete during checkout

⸻

4. System Functionality Overview

4.1 Drag & Drop

Used for:
	•	Recruiting board movement
	•	Depth chart adjustments
	•	Training block ordering
	•	Practice plan structuring

⸻

4.2 Batch Operations

Used for:
	•	Multi-athlete tagging
	•	Bulk status changes
	•	Bulk evaluations
	•	Bulk messaging
	•	Import/Export operations

⸻

4.3 Mild UI Animations
	•	Hover transitions
	•	Smooth list reordering
	•	Page/section slides
	•	Loading skeletons
	•	Momentary cell highlighting after saves

Focused on clarity and intuitiveness, not flashiness.

⸻

4.4 Equipment Tracking (Optional Future Module)

Not part of the initial build, but architecture supports future addition:
	•	Inventory
	•	Check-out
	•	Uniform assignments
	•	Implement management

⸻

5. Cross-Platform & Performance
	•	Desktop-first, mobile supported
	•	Fast load times for coaching environments
	•	Progressive enhancement for offline-friendly training logging (future)
	•	Responsive UI components

⸻

6. Data Architecture Summary

The database must support:
	•	User accounts with role-based permissions
	•	Organization-level grouping
	•	Team/event-group segmentation
	•	Athlete profiles
	•	Recruiting boards & scoring
	•	Performance metrics
	•	Training sessions
	•	Notifications & tasks
	•	Subscription & billing data
	•	AI suggestions and system logs

All governed by Supabase Row Level Security (RLS).

⸻

7. Technology Stack
	•	Next.js (App Router)
	•	TypeScript
	•	Supabase (Postgres + Auth + Storage + RLS)
	•	Stripe Billing
	•	Vercel Deployment
	•	Tailwind + ShadCN UI
	•	OpenAI / LangChain for AI modules

⸻

8. Success Outcomes

The platform should measurably:
	1.	Increase coaching efficiency
	2.	Improve athlete development quality
	3.	Raise the overall capability of high school coaches
	4.	Improve the clarity and quality of recruiting pipelines
	5.	Provide unified athlete data across environments
	6.	Enable data-driven decision making
	7.	Reduce wasted communication and duplicated effort
	8.	Leverage AI to simplify complex coaching judgments

⸻

9. Out-of-Scope Items

Explicit exclusions:
	•	Booster club management
	•	Full athletic department accounting
	•	Travel logistics systems
	•	Fundraising modules

These may become future optional modules but are not part of the core mission.

⸻

10. Foundational Philosophy

The ecosystem is built on five guiding principles:
	1.	Elevate coaching quality at every level
	2.	Enhance athlete experience and long-term development
	3.	Strengthen the HS → College pipeline
	4.	Reduce operational friction via intelligent automation
	5.	Use AI to remove guesswork and support confident decisions

The platform is not simply a tool — it is a coaching intelligence system and an integrated development engine for the entire sport ecosystem.