-- training_exercises RLS + helper for mapping auth.uid() -> public.users.id

-- 1) Helper: current_app_user_id()
create or replace function public.current_app_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.id
  from public.users u
  where u.auth_id = auth.uid()
  limit 1
$$;

-- 2) Enable RLS
alter table public.training_exercises enable row level security;

-- Optional but recommended: prevents table owner bypass in some contexts
-- (service_role still bypasses RLS as expected)
alter table public.training_exercises force row level security;

-- 3) Drop old policies if re-running (safe idempotency)
drop policy if exists training_exercises_select_for_program_members on public.training_exercises;
drop policy if exists training_exercises_insert_program_owned on public.training_exercises;
drop policy if exists training_exercises_update_program_owned on public.training_exercises;
drop policy if exists training_exercises_delete_program_owned on public.training_exercises;

-- 4) SELECT: allow reading system exercises + program-owned exercises for members
create policy training_exercises_select_for_program_members
on public.training_exercises
for select
using (
  program_id is null
  or exists (
    select 1
    from public.program_members pm
    where pm.program_id = training_exercises.program_id
      and pm.user_id = public.current_app_user_id()
  )
);

-- 5) INSERT: members can create exercises only for their program (never system)
create policy training_exercises_insert_program_owned
on public.training_exercises
for insert
with check (
  program_id is not null
  and exists (
    select 1
    from public.program_members pm
    where pm.program_id = training_exercises.program_id
      and pm.user_id = public.current_app_user_id()
  )
);

-- 6) UPDATE: members can update only their program’s exercises (never system)
create policy training_exercises_update_program_owned
on public.training_exercises
for update
using (
  program_id is not null
  and exists (
    select 1
    from public.program_members pm
    where pm.program_id = training_exercises.program_id
      and pm.user_id = public.current_app_user_id()
  )
)
with check (
  program_id is not null
  and exists (
    select 1
    from public.program_members pm
    where pm.program_id = training_exercises.program_id
      and pm.user_id = public.current_app_user_id()
  )
);

-- 7) DELETE: members can delete only their program’s exercises (never system)
create policy training_exercises_delete_program_owned
on public.training_exercises
for delete
using (
  program_id is not null
  and exists (
    select 1
    from public.program_members pm
    where pm.program_id = training_exercises.program_id
      and pm.user_id = public.current_app_user_id()
  )
);