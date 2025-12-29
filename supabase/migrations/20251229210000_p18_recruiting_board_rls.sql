-- PROMOTION 18
-- Apply RLS to program_recruits (program-scoped) and recruits (global) for recruiting board reads.
-- Policy:
-- - program_recruits rows are readable by members of that program.
-- - recruits rows are readable only if the user is a member of at least one program that references that recruit.

alter table public.program_recruits enable row level security;
alter table public.recruits enable row level security;

revoke all on table public.program_recruits from anon, authenticated;
revoke all on table public.recruits from anon, authenticated;

-- PROGRAM_RECRUITS: read by program members
drop policy if exists program_recruits_select_program_members on public.program_recruits;
create policy program_recruits_select_program_members
on public.program_recruits
for select
to authenticated
using (
  exists (
    select 1
    from public.program_members pm
    where pm.program_id = program_recruits.program_id
      and pm.user_id = auth.uid()::uuid
  )
);

-- PROGRAM_RECRUITS: allow inserts/updates by program members (coach tools)
-- You may later tighten write roles; for now keep it program-member scoped.
drop policy if exists program_recruits_insert_program_members on public.program_recruits;
create policy program_recruits_insert_program_members
on public.program_recruits
for insert
to authenticated
with check (
  exists (
    select 1
    from public.program_members pm
    where pm.program_id = program_recruits.program_id
      and pm.user_id = auth.uid()::uuid
  )
);

drop policy if exists program_recruits_update_program_members on public.program_recruits;
create policy program_recruits_update_program_members
on public.program_recruits
for update
to authenticated
using (
  exists (
    select 1
    from public.program_members pm
    where pm.program_id = program_recruits.program_id
      and pm.user_id = auth.uid()::uuid
  )
)
with check (
  exists (
    select 1
    from public.program_members pm
    where pm.program_id = program_recruits.program_id
      and pm.user_id = auth.uid()::uuid
  )
);

-- Optional: deletes restricted (keep historical board rows)
drop policy if exists program_recruits_no_delete on public.program_recruits;
create policy program_recruits_no_delete
on public.program_recruits
for delete
to authenticated
using (false);

-- RECRUITS: readable if referenced by at least one program the user belongs to
drop policy if exists recruits_select_if_in_member_program on public.recruits;
create policy recruits_select_if_in_member_program
on public.recruits
for select
to authenticated
using (
  exists (
    select 1
    from public.program_recruits pr
    join public.program_members pm
      on pm.program_id = pr.program_id
    where pr.recruit_id = recruits.id
      and pm.user_id = auth.uid()::uuid
  )
);

-- RECRUITS: no client writes (global canonical surface)
drop policy if exists recruits_no_client_insert on public.recruits;
create policy recruits_no_client_insert
on public.recruits
for insert
to authenticated
with check (false);

drop policy if exists recruits_no_client_update on public.recruits;
create policy recruits_no_client_update
on public.recruits
for update
to authenticated
using (false);

drop policy if exists recruits_no_client_delete on public.recruits;
create policy recruits_no_client_delete
on public.recruits
for delete
to authenticated
using (false);

-- View grants
grant select on public.recruiting_board_v1 to authenticated;

