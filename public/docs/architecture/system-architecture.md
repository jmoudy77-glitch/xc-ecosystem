# System Architecture

High-level diagram and explanation of the entire XC Ecosystem:

- Next.js App Router web application
- Supabase (Postgres + RLS) as primary data store
- Stripe for athlete/program subscriptions
- External integrations (results feeds, email, etc.)
- Major domain modules:
  - Roster & Seasons
  - Recruiting & Pipeline
  - Athlete Profiles & Training
  - Team Operations
  - Results & Meets
  - AI Layer
  - Billing & Identity
