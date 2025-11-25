# Database Schema (Supabase / Postgres)

## Core Tables

### users
- `id` (uuid, primary key)
- `email` (text, unique)
- `name` (text, nullable)
- `created_at` (timestamp)

### organizations
- `id` (uuid, primary key)
- `name` (text)
- `type` (text: 'college' | 'high_school')
- `created_at` (timestamp)

### memberships
- `id` (uuid, primary key)
- `user_id` (uuid, fk -> users.id)
- `organization_id` (uuid, fk -> organizations.id)
- `role` (text: 'owner' | 'coach' | 'assistant')
- `created_at` (timestamp)

### recruits
- `id` (uuid, primary key)
- `organization_id` (uuid, fk -> organizations.id)
- `first_name` (text)
- `last_name` (text)
- `grad_year` (int)
- `event_group` (text: 'distance' | 'sprints' | 'throws' | 'jumps' | 'xc')
- `status` (text: 'new' | 'active' | 'offer_made' | 'committed' | 'not_a_fit')
- `notes` (text)
- `created_at` (timestamp)

### athletes
- `id` (uuid, primary key)
- `organization_id` (uuid, fk -> organizations.id)
- `first_name` (text)
- `last_name` (text)
- `grad_year` (int)
- `event_group` (text)
- `created_at` (timestamp)

*(We’ll expand this later with training logs, workouts, etc.)*
