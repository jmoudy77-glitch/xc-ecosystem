-- program_health_absences: allow SELECT via program_id OR legacy scope_id
-- Existing policy (shown in pg_policies):
-- (program_id IN (SELECT pm.program_id FROM program_members pm WHERE pm.user_id = auth.uid()))
--
-- Some rows are keyed by scope_id for program scoping; these must be readable by the same membership rule.

alter table public.program_health_absences enable row level security;

drop policy if exists ph_absences_program_read on public.program_health_absences;

create policy ph_absences_program_read
on public.program_health_absences
as permissive
for select
to public
using (
  (program_id in (
    select pm.program_id
    from public.program_members pm
    where pm.user_id = auth.uid()
  ))
  or
  (scope_id in (
    select pm.program_id
    from public.program_members pm
    where pm.user_id = auth.uid()
  ))
);
