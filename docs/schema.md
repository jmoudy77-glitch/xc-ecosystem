Recruiting Ecosystem — Database Schema

Version: 2.0
Last Updated: YYYY-MM-DD

This document defines the canonical database schema for the Recruiting Ecosystem.
It includes entities, relationships, and architectural domains across:
	•	Recruiting & Pipeline
	•	Program / Team / Roster Management
	•	Athlete Data & Development
	•	High School Coaching Tools
	•	AI Intelligence Layer
	•	Billing (Stripe)
	•	User Roles, Permissions & RLS

The database runs on Supabase (Postgres + RLS).

⸻

1. Schema Overview

The ecosystem uses a modular relational schema engineered for:
	•	large-scale athlete data
	•	cross-org user memberships
	•	AI scoring & recommendations
	•	drag-and-drop recruiting workflows
	•	flexible training & practice planning
	•	multi-tier subscriptions

We divide the schema into 7 major domains:
	1.	Users & Orgs
	2.	Programs, Teams & Rosters
	3.	Athletes & Performance Data
	4.	Recruiting & Pipeline
	5.	High School Coaching Tools
	6.	AI Intelligence Layer
	7.	Billing & Subscriptions

⸻

2. Users & Organizations

2.1 users

Represents all users: HS coaches, college coaches, athletes.
| Column       | Type        | Notes                               |
|--------------|-------------|--------------------------------------|
| id           | uuid (pk)   | Internal user ID                     |
| auth_id      | uuid        | Matches auth.uid()                   |
| role         | text        | 'coach' or 'athlete'                 |
| display_name | text        | Optional                             |
| email        | text        | Optional                             |
| default_org  | uuid (fk)   | User's selected default org          |
| created_at   | timestamptz | Default now()                        |

⸻

2.2 orgs
| Column      | Type        | Notes                     |
|-------------|-------------|---------------------------|
| id          | uuid (pk)   |                           |
| name        | text        | Organization name         |
| level       | text        | 'hs' or 'college'         |
| created_at  | timestamptz |                           |

⸻

2.3 programs
| Column      | Type        | Notes                                 |
|-------------|-------------|----------------------------------------|
| id          | uuid (pk)   |                                        |
| org_id      | uuid (fk)   | references orgs.id                     |
| sport       | text        | e.g., 'track_and_field'                |
| gender      | text        | 'men' or 'women'                       |
| created_at  | timestamptz |                                        |

⸻

2.4 org_memberships
| Column  | Type      | Notes                                  |
|---------|-----------|-----------------------------------------|
| user_id | uuid (fk) |                                        |
| org_id  | uuid (fk) |                                        |
| role    | text      | 'head_coach', 'assistant', etc.         |
Composite PK: (user_id, org_id)

⸻

3. Programs, Teams & Rosters

3.1 teams
| Column     | Type        | Notes                     |
|------------|-------------|---------------------------|
| id         | uuid (pk)   |                           |
| org_id     | uuid (fk)   | references orgs.id        |
| name       | text        | sprints, distance, etc.   |
| created_at | timestamptz |                           |

⸻

3.2 team_memberships
| Column     | Type      | Notes                      |
|------------|-----------|----------------------------|
| team_id    | uuid (fk) | Team ID                    |
| athlete_id | uuid (fk) | Athlete assigned to team   |
Composite PK: (team_id, athlete_id)

⸻

4. Athletes & Performance Data

4.1 athletes
| Column      | Type        | Notes                             |
|-------------|-------------|-----------------------------------|
| id          | uuid (pk)   |                                   |
| org_id      | uuid (fk)   | Organization athlete belongs to   |
| first_name  | text        |                                   |
| last_name   | text        |                                   |
| grad_year   | int         |                                   |
| contact     | jsonb       |                                   |
| academics   | jsonb       |                                   |
| created_at  | timestamptz |                                   |

⸻

4.2 athlete_events
| Column     | Type      | Notes                          |
|------------|-----------|---------------------------------|
| athlete_id | uuid (fk) |                                 |
| event      | text      | e.g., '100m', 'long_jump'       |
Composite PK: (athlete_id, event)

⸻

4.3 performances
| Column      | Type        | Notes                            |
|-------------|-------------|----------------------------------|
| id          | uuid (pk)   |                                  |
| athlete_id  | uuid (fk)   |                                  |
| event       | text        |                                  |
| performance | numeric/text| Time or mark                     |
| date        | date        |                                  |
| meet_name   | text        |                                  |

⸻

4.4 tests
| Column     | Type        | Notes                         |
|------------|-------------|-------------------------------|
| id         | uuid (pk)   |                               |
| athlete_id | uuid (fk)   |                               |
| metric     | text        | e.g., '30m fly', 'vert'       |
| value      | numeric     |                               |
| unit       | text        |                               |
| date       | date        |                               |

⸻

4.5 training_logs
| Column       | Type        | Notes                |
|--------------|-------------|----------------------|
| id           | uuid (pk)   |                      |
| athlete_id   | uuid (fk)   |                      |
| date         | date        |                      |
| session_type | text        |                      |
| description  | text        |                      |
| rpe          | int         | Rating of effort     |
| duration     | int         | Minutes              |

⸻

5. Recruiting & Pipeline

5.1 recruiting_boards
| Column     | Type      | Notes                          |
|------------|-----------|---------------------------------|
| id         | uuid (pk) |                                 |
| org_id     | uuid (fk) |                                 |
| team_id    | uuid (fk) | nullable                        |
| name       | text      | 'default', etc.                 |
| created_at | timestamptz |                               |

⸻

5.2 recruiting_stages
| Column      | Type      | Notes                        |
|-------------|-----------|------------------------------|
| id          | uuid (pk) |                              |
| board_id    | uuid (fk) |                              |
| name        | text      | Stage name                   |
| order_index | int       | Column order                 |

⸻

5.3 recruiting_board_items
| Column       | Type      | Notes                         |
|--------------|-----------|-------------------------------|
| id           | uuid (pk) |                               |
| board_id     | uuid (fk) |                               |
| athlete_id   | uuid (fk) | Recruit / prospect            |
| stage_id     | uuid (fk) |                               |
| order_index  | int       |                               |
| priority_flag| boolean   |                               |

⸻

5.4 recruit_tags
| Column     | Type      | Notes         |
|------------|-----------|---------------|
| id         | uuid pk   |               |
| athlete_id | uuid fk   |               |
| tag        | text      |               |

⸻

5.5 recruit_notes
| Column     | Type        | Notes                |
|------------|-------------|----------------------|
| id         | uuid (pk)   |                      |
| athlete_id | uuid (fk)   |                      |
| user_id    | uuid (fk)   | coach who wrote note |
| note       | text        |                      |
| created_at | timestamptz |                      |

⸻

5.6 recruit_evaluations
| Column      | Type        | Notes                          |
|-------------|-------------|--------------------------------|
| id          | uuid (pk)   |                                |
| athlete_id  | uuid (fk)   |                                |
| user_id     | uuid (fk)   |                                |
| template_id | uuid        | optional                       |
| scores      | jsonb       | evaluation scores              |
| comments    | text        |                                |
| created_at  | timestamptz |                                |

⸻

6. HS Coaching Tools

6.1 season_plans
| Column     | Type        | Notes       |
|------------|-------------|-------------|
| id         | uuid (pk)   |             |
| org_id     | uuid (fk)   |             |
| team_id    | uuid (fk)   |             |
| title      | text        |             |
| created_at | timestamptz |             |

⸻

6.2 practice_plans
| Column     | Type        | Notes      |
|------------|-------------|------------|
| id         | uuid (pk)   |            |
| season_id  | uuid (fk)   |            |
| date       | date        |            |
| title      | text        |            |
| created_at | timestamptz |            |

⸻

6.3 practice_blocks
| Column      | Type        | Notes                         |
|-------------|-------------|-------------------------------|
| id          | uuid (pk)   |                               |
| practice_id | uuid (fk)   |                               |
| order_index | int         |                               |
| block_type  | text        | warmup, drills, main_set, etc |
| description | text        |                               |

⸻

6.4 attendance
| Column      | Type        | Notes                    |
|-------------|-------------|--------------------------|
| id          | uuid (pk)   |                          |
| practice_id | uuid (fk)   |                          |
| athlete_id  | uuid (fk)   |                          |
| status      | text        | present/absent/modified  |
| notes       | text        |                          |

⸻

6.5 coach_knowledge_topics
| Column      | Type      | Notes                      |
|-------------|-----------|----------------------------|
| id          | uuid (pk) |                            |
| name        | text      |                            |
| event_group | text      | 'sprints', 'distance', etc |

⸻

6.6 coach_knowledge_items
| Column      | Type        | Notes                         |
|-------------|-------------|-------------------------------|
| id          | uuid (pk)   |                               |
| topic_id    | uuid (fk)   | links to topic                |
| type        | text        | 'video', 'drill', 'article'   |
| title       | text        |                               |
| body        | text        |                               |
| media_url   | text        | optional                      |
| created_at  | timestamptz |                               |

⸻

7. AI Intelligence Layer

7.1 ai_scout_scores
| Column      | Type        | Notes                      |
|-------------|-------------|----------------------------|
| id          | uuid (pk)   |                            |
| athlete_id  | uuid (fk)   |                            |
| score       | numeric     |                            |
| explanation | text        |                            |
| created_at  | timestamptz |                            |

⸻

7.2 ai_commit_estimates
| Column      | Type        | Notes                      |
|-------------|-------------|----------------------------|
| id          | uuid (pk)   |                            |
| athlete_id  | uuid (fk)   |                            |
| probability | numeric     | 0–1                        |
| explanation | text        |                            |
| created_at  | timestamptz |                            |

⸻

7.3 ai_recommendations
| Column        | Type        | Notes                           |
|---------------|-------------|---------------------------------|
| id            | uuid (pk)   |                                 |
| target_type   | text        | 'athlete', 'team', 'org'        |
| target_id     | uuid (fk)   |                                 |
| category      | text        | training/recruiting/development |
| recommendation| text        |                                 |
| created_at    | timestamptz |                                 |

⸻

8. Billing & Subscriptions

8.1 org_subscriptions
| Column                | Type        | Notes                  |
|-----------------------|-------------|------------------------|
| id                    | uuid (pk)   |                        |
| org_id                | uuid (fk)   |                        |
| stripe_customer_id    | text        |                        |
| stripe_subscription_id| text        |                        |
| plan_code             | text        |                        |
| status                | text        |                        |
| current_period_end    | timestamptz |                        |
| cancel_at_period_end  | boolean     |                        |
| created_at            | timestamptz |                        |

⸻

8.2 athlete_subscriptions
| Column                | Type        | Notes                  |
|-----------------------|-------------|------------------------|
| id                    | uuid (pk)   |                        |
| user_id               | uuid (fk)   |                        |
| stripe_customer_id    | text        |                        |
| stripe_subscription_id| text        |                        |
| plan_code             | text        |                        |
| status                | text        |                        |
| current_period_end    | timestamptz |                        |
| cancel_at_period_end  | boolean     |                        |
| created_at            | timestamptz |                        |

⸻

10. RLS Summary

users
	•	select: auth.uid() = auth_id
	•	update: self-only
	•	insert: allowed when new.auth_id = auth.uid()

orgs
	•	visible only if user has membership in org → via org_memberships

teams, athletes, performance tables
	•	access restricted to users with membership in the org/team

recruiting tables
	•	accessible to org members only
	•	athletes only see their own profile (not recruiting data)

subscriptions
	•	org users: access subscriptions for their org
	•	athletes: access subscription for their own user_id

⸻

11. Change Log

2025-11-29 — V1 Schema

Imported original schema.
** ￼**

2025-12-30 — V2 Schema (Current)
	•	Added HS Coaching pillar tables
	•	Added AI Intelligence layer tables
	•	Added full Recruiting & Pipeline tables
	•	Replaced unified subscriptions with org_subscriptions + athlete_subscriptions
	•	Added missing relationships
	•	Added knowledge base schema
	•	Aligned table names to project architecture
	•	Rewritten in Markdown for consistency across documents