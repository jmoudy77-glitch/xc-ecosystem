-- supabase/migrations/20251217160500_workouts_rls.sql
-- RLS for workouts + global (system) templates

begin;

-- Ensure RLS is on
alter table public.workouts enable row level security;

-- Helpful: represent Global workouts as is_system_template=true and program_id IS NULL
-- (If you already have program_id NOT NULL, we can still do global, but NULL is clean.)

-- Read: allow any authenticated user to read Global workouts
drop policy if exists "workouts_select_global" on public.workouts;
create policy "workouts_select_global"
on public.workouts
for select
to authenticated
using (is_system_template = true);

-- Read: allow program members to read workouts in their program
drop policy if exists "workouts_select_program" on public.workouts;
create policy "workouts_select_program"
on public.workouts
for select
to authenticated
using (
  program_id is not null
  and exists (
    select 1
    from public.program_members pm
    where pm.program_id = workouts.program_id
      and pm.user_id = auth.uid()
  )
);

-- Insert: only program members can create program workouts; Global cannot be created via app
drop policy if exists "workouts_insert_program" on public.workouts;
create policy "workouts_insert_program"
on public.workouts
for insert
to authenticated
with check (
  is_system_template = false
  and program_id is not null
  and exists (
    select 1
    from public.program_members pm
    where pm.program_id = workouts.program_id
      and pm.user_id = auth.uid()
  )
);

-- Update: only program members can update program workouts; Global is read-only
drop policy if exists "workouts_update_program" on public.workouts;
create policy "workouts_update_program"
on public.workouts
for update
to authenticated
using (
  is_system_template = false
  and program_id is not null
  and exists (
    select 1
    from public.program_members pm
    where pm.program_id = workouts.program_id
      and pm.user_id = auth.uid()
  )
)
with check (
  is_system_template = false
  and program_id is not null
  and exists (
    select 1
    from public.program_members pm
    where pm.program_id = workouts.program_id
      and pm.user_id = auth.uid()
  )
);

-- Delete: only program members can delete program workouts; Global cannot be deleted via app
drop policy if exists "workouts_delete_program" on public.workouts;
create policy "workouts_delete_program"
on public.workouts
for delete
to authenticated
using (
  is_system_template = false
  and program_id is not null
  and exists (
    select 1
    from public.program_members pm
    where pm.program_id = workouts.program_id
      and pm.user_id = auth.uid()
  )
);

commit;