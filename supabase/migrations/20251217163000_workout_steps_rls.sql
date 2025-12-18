-- workout_steps RLS
alter table public.workout_steps enable row level security;

-- Read: Global OR member-of-program workout
drop policy if exists "workout_steps_select" on public.workout_steps;
create policy "workout_steps_select"
on public.workout_steps
for select
using (
  exists (
    select 1
    from public.workouts w
    left join public.program_members pm
      on pm.program_id = w.program_id
    left join public.users u
      on u.id = pm.user_id
    where w.id = workout_steps.workout_id
      and (
        w.is_system_template = true
        or u.auth_id = auth.uid()
      )
  )
);

-- Insert: only into NON-global workouts for programs you belong to
drop policy if exists "workout_steps_insert" on public.workout_steps;
create policy "workout_steps_insert"
on public.workout_steps
for insert
with check (
  exists (
    select 1
    from public.workouts w
    join public.program_members pm
      on pm.program_id = w.program_id
    join public.users u
      on u.id = pm.user_id
    where w.id = workout_steps.workout_id
      and w.is_system_template = false
      and u.auth_id = auth.uid()
  )
);

-- Update: only for NON-global workouts for programs you belong to
drop policy if exists "workout_steps_update" on public.workout_steps;
create policy "workout_steps_update"
on public.workout_steps
for update
using (
  exists (
    select 1
    from public.workouts w
    join public.program_members pm
      on pm.program_id = w.program_id
    join public.users u
      on u.id = pm.user_id
    where w.id = workout_steps.workout_id
      and w.is_system_template = false
      and u.auth_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.workouts w
    join public.program_members pm
      on pm.program_id = w.program_id
    join public.users u
      on u.id = pm.user_id
    where w.id = workout_steps.workout_id
      and w.is_system_template = false
      and u.auth_id = auth.uid()
  )
);

-- Delete: only for NON-global workouts for programs you belong to
drop policy if exists "workout_steps_delete" on public.workout_steps;
create policy "workout_steps_delete"
on public.workout_steps
for delete
using (
  exists (
    select 1
    from public.workouts w
    join public.program_members pm
      on pm.program_id = w.program_id
    join public.users u
      on u.id = pm.user_id
    where w.id = workout_steps.workout_id
      and w.is_system_template = false
      and u.auth_id = auth.uid()
  )
);