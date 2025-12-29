-- PROMOTION 16
-- RLS for derived recruiting read models.
-- Principle: program members can read recruiting snapshots for their program.
-- No direct writes are expected from clients; only system triggers write to recruiting_snapshots.

alter table public.recruiting_snapshots enable row level security;

-- Lock down by default
revoke all on table public.recruiting_snapshots from anon, authenticated;

-- Read: program members only
drop policy if exists recruiting_snapshots_select_program_members on public.recruiting_snapshots;
create policy recruiting_snapshots_select_program_members
on public.recruiting_snapshots
for select
to authenticated
using (
  exists (
    select 1
    from public.program_members pm
    where pm.program_id = recruiting_snapshots.program_id
      and pm.user_id = auth.uid()::uuid
  )
);

-- No client inserts/updates/deletes
drop policy if exists recruiting_snapshots_no_client_insert on public.recruiting_snapshots;
create policy recruiting_snapshots_no_client_insert
on public.recruiting_snapshots
for insert
to authenticated
with check (false);

drop policy if exists recruiting_snapshots_no_client_update on public.recruiting_snapshots;
create policy recruiting_snapshots_no_client_update
on public.recruiting_snapshots
for update
to authenticated
using (false);

drop policy if exists recruiting_snapshots_no_client_delete on public.recruiting_snapshots;
create policy recruiting_snapshots_no_client_delete
on public.recruiting_snapshots
for delete
to authenticated
using (false);

-- View access: explicit grants (views inherit underlying table RLS; grant needed for select)
grant select on public.latest_recruiting_snapshot to authenticated;

