-- workouts + workout_steps RLS
-- Allows:
-- - Everyone logged in can READ global workouts (is_system_template = true)
-- - Program members can READ/WRITE workouts for their program
-- - Only program members can INSERT workout_steps for workouts they own
-- - Global workouts remain READ-ONLY

-- 1) Helper: map auth.uid() -> public.users.id
create or replace function public.current_user_id()
returns uuid
language sql
stable
as $$
  select u.id
  from public.users u
  where u.auth_id = auth.uid()
  limit 1
$$;

-- 2) Helper: determine membership in a program
create or replace function public.is_program_member(p_program_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.program_members pm
    where pm.program_id = p_program_id
      and pm.user_id = public.current_user_id()
  )
$$;

-- 3) WORKOUTS policies
alter table public.workouts enable row level security;

drop policy if exists "workouts_select" on public.workouts;
create policy "workouts_select"
on public.workouts
for select
to authenticated
using (
  is_system_template = true
  or public.is_program_member(program_id)
);

drop policy if exists "workouts_insert" on public.workouts;
create policy "workouts_insert"
on public.workouts
for insert
to authenticated
with check (
  -- cannot create global templates from app context
  public.is_program_member(program_id)
  and coalesce(is_system_template, false) = false
);

drop policy if exists "workouts_update" on public.workouts;
create policy "workouts_update"
on public.workouts
for update
to authenticated
using (
  public.is_program_member(program_id)
  and is_system_template = false
)
with check (
  public.is_program_member(program_id)
  and is_system_template = false
);

drop policy if exists "workouts_delete" on public.workouts;
create policy "workouts_delete"
on public.workouts
for delete
to authenticated
using (
  public.is_program_member(program_id)
  and is_system_template = false
);

-- 4) WORKOUT_STEPS policies
alter table public.workout_steps enable row level security;

drop policy if exists "workout_steps_select" on public.workout_steps;
create policy "workout_steps_select"
on public.workout_steps
for select
to authenticated
using (
  exists (
    select 1
    from public.workouts w
    where w.id = workout_steps.workout_id
      and (
        w.is_system_template = true
        or public.is_program_member(w.program_id)
      )
  )
);

drop policy if exists "workout_steps_insert" on public.workout_steps;
create policy "workout_steps_insert"
on public.workout_steps
for insert
to authenticated
with check (
  exists (
    select 1
    from public.workouts w
    where w.id = workout_steps.workout_id
      and w.is_system_template = false
      and public.is_program_member(w.program_id)
  )
);

drop policy if exists "workout_steps_update" on public.workout_steps;
create policy "workout_steps_update"
on public.workout_steps
for update
to authenticated
using (
  exists (
    select 1
    from public.workouts w
    where w.id = workout_steps.workout_id
      and w.is_system_template = false
      and public.is_program_member(w.program_id)
  )
)
with check (
  exists (
    select 1
    from public.workouts w
    where w.id = workout_steps.workout_id
      and w.is_system_template = false
      and public.is_program_member(w.program_id)
  )
);

drop policy if exists "workout_steps_delete" on public.workout_steps;
create policy "workout_steps_delete"
on public.workout_steps
for delete
to authenticated
using (
  exists (
    select 1
    from public.workouts w
    where w.id = workout_steps.workout_id
      and w.is_system_template = false
      and public.is_program_member(w.program_id)
  )
);