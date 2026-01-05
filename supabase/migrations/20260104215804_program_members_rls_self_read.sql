-- Allow authenticated users to read their own program_members rows.
-- This is required because other table policies (e.g., program_health_absences) use subqueries
-- against program_members; if program_members RLS blocks SELECT, those subqueries return 0 rows.

alter table public.program_members enable row level security;

drop policy if exists program_members_self_read on public.program_members;

create policy program_members_self_read
on public.program_members
as permissive
for select
to authenticated
using (user_id = auth.uid());
