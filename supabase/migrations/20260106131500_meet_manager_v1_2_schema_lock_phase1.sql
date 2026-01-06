-- meet_manager v1.2: schema lock phase 1 (core spine)
-- Grounded in existing v1.2 migrations:
--   20260105190000_meet_manager_v1_2_core_schema.sql
--   20260105201500_meet_manager_v1_2_enum_values.sql
--   20260105203000_meet_manager_v1_2_enum_placeholder_guards.sql
--
-- Goals:
-- 1) Remove permissive public SELECT policies on base tables (meets / meet_events / meet_results)
-- 2) Add membership/host authority helpers using users.auth_id + program_members
-- 3) Add append-only enforcement for meet_results + ops_token_audit
-- 4) Add authenticated RLS policies aligned to:
--    - host authority derived from meet_participants.role = HOST
--    - program authority derived from program_members membership
-- 5) Create public-safe read views (only public surface), and grant anon/authenticated

begin;

-- -----------------------------------------------------------------------------
-- 0) Canonical helpers (auth mapping + membership predicates)
-- -----------------------------------------------------------------------------

create or replace function public.mm_is_service_role()
returns boolean
language sql
stable
as $$
  select coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role';
$$;

create or replace function public.mm_app_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.id
  from public.users u
  where u.auth_id = auth.uid()
  limit 1;
$$;

create or replace function public.mm_is_program_member(p_program_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.program_members pm
    where pm.program_id = p_program_id
      and pm.user_id = public.mm_app_user_id()
  );
$$;

create or replace function public.mm_is_meet_program_member(p_meet_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.meet_participants mp
    where mp.meet_id = p_meet_id
      and public.mm_is_program_member(mp.program_id)
  );
$$;

create or replace function public.mm_is_meet_host(p_meet_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.meet_participants mp
    where mp.meet_id = p_meet_id
      and mp.role = 'HOST'::public.mm_participation_role
      and public.mm_is_program_member(mp.program_id)
  );
$$;

create or replace function public.mm_is_program_participant(p_meet_id uuid, p_program_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.meet_participants mp
    where mp.meet_id = p_meet_id
      and mp.program_id = p_program_id
  );
$$;

-- -----------------------------------------------------------------------------
-- 1) Append-only enforcement (meet_results, ops_token_audit)
-- -----------------------------------------------------------------------------

create or replace function public.mm_block_update_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception 'append_only_violation';
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_meet_results_block_update'
      and tgrelid = 'public.meet_results'::regclass
  ) then
    create trigger trg_meet_results_block_update
    before update on public.meet_results
    for each row execute function public.mm_block_update_delete();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_meet_results_block_delete'
      and tgrelid = 'public.meet_results'::regclass
  ) then
    create trigger trg_meet_results_block_delete
    before delete on public.meet_results
    for each row execute function public.mm_block_update_delete();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_ops_token_audit_block_update'
      and tgrelid = 'public.ops_token_audit'::regclass
  ) then
    create trigger trg_ops_token_audit_block_update
    before update on public.ops_token_audit
    for each row execute function public.mm_block_update_delete();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_ops_token_audit_block_delete'
      and tgrelid = 'public.ops_token_audit'::regclass
  ) then
    create trigger trg_ops_token_audit_block_delete
    before delete on public.ops_token_audit
    for each row execute function public.mm_block_update_delete();
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 2) Tighten RLS: remove permissive public table policies
-- -----------------------------------------------------------------------------

drop policy if exists meets_public_select on public.meets;
drop policy if exists meet_events_public_select on public.meet_events;
drop policy if exists meet_results_public_select on public.meet_results;

-- Optional hardening: remove direct anon table reads; public reads go through views.
revoke select on public.meets from anon;
revoke select on public.meet_events from anon;
revoke select on public.meet_results from anon;

revoke select on public.meet_participants from anon;
revoke select on public.meet_rosters from anon;
revoke select on public.meet_entries from anon;
revoke select on public.ops_tokens from anon;
revoke select on public.ops_token_audit from anon;

-- -----------------------------------------------------------------------------
-- 3) meet_entries: add program_id for deterministic program authority (if missing)
-- -----------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'meet_entries'
      and column_name = 'program_id'
  ) then
    alter table public.meet_entries add column program_id uuid;
    create index if not exists meet_entries_program_id_idx on public.meet_entries(program_id);
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 4) Authenticated RLS policies (host + participant program membership)
-- -----------------------------------------------------------------------------

-- meets
drop policy if exists mm_meets_select_member on public.meets;
create policy mm_meets_select_member
on public.meets
for select
to authenticated
using (
  public.mm_is_program_member(host_program_id)
  or public.mm_is_meet_program_member(id)
);

drop policy if exists mm_meets_insert_host_program_member on public.meets;
create policy mm_meets_insert_host_program_member
on public.meets
for insert
to authenticated
with check (
  public.mm_is_program_member(host_program_id)
);

drop policy if exists mm_meets_update_host_program_member on public.meets;
create policy mm_meets_update_host_program_member
on public.meets
for update
to authenticated
using (public.mm_is_program_member(host_program_id))
with check (public.mm_is_program_member(host_program_id));

drop policy if exists mm_meets_delete_host_program_member on public.meets;
create policy mm_meets_delete_host_program_member
on public.meets
for delete
to authenticated
using (public.mm_is_program_member(host_program_id));

-- meet_participants
drop policy if exists mm_participants_select_program_member on public.meet_participants;
create policy mm_participants_select_program_member
on public.meet_participants
for select
to authenticated
using (public.mm_is_program_member(program_id));

drop policy if exists mm_participants_insert_program_member on public.meet_participants;
create policy mm_participants_insert_program_member
on public.meet_participants
for insert
to authenticated
with check (public.mm_is_program_member(program_id));

drop policy if exists mm_participants_update_host_only on public.meet_participants;
create policy mm_participants_update_host_only
on public.meet_participants
for update
to authenticated
using (public.mm_is_meet_host(meet_id))
with check (public.mm_is_meet_host(meet_id));

drop policy if exists mm_participants_delete_host_only on public.meet_participants;
create policy mm_participants_delete_host_only
on public.meet_participants
for delete
to authenticated
using (public.mm_is_meet_host(meet_id));

-- meet_rosters
drop policy if exists mm_rosters_select_program_member on public.meet_rosters;
create policy mm_rosters_select_program_member
on public.meet_rosters
for select
to authenticated
using (public.mm_is_program_member(program_id));

drop policy if exists mm_rosters_insert_program_member on public.meet_rosters;
create policy mm_rosters_insert_program_member
on public.meet_rosters
for insert
to authenticated
with check (
  public.mm_is_program_member(program_id)
  and public.mm_is_program_participant(meet_id, program_id)
);

drop policy if exists mm_rosters_update_program_member on public.meet_rosters;
create policy mm_rosters_update_program_member
on public.meet_rosters
for update
to authenticated
using (public.mm_is_program_member(program_id))
with check (public.mm_is_program_member(program_id));

drop policy if exists mm_rosters_delete_host_only on public.meet_rosters;
create policy mm_rosters_delete_host_only
on public.meet_rosters
for delete
to authenticated
using (public.mm_is_meet_host(meet_id));

-- meet_entries
drop policy if exists mm_entries_select_meet_program_member on public.meet_entries;
create policy mm_entries_select_meet_program_member
on public.meet_entries
for select
to authenticated
using (public.mm_is_meet_program_member(meet_id));

drop policy if exists mm_entries_insert_program_member on public.meet_entries;
create policy mm_entries_insert_program_member
on public.meet_entries
for insert
to authenticated
with check (
  program_id is not null
  and public.mm_is_program_member(program_id)
  and public.mm_is_program_participant(meet_id, program_id)
);

drop policy if exists mm_entries_update_program_member on public.meet_entries;
create policy mm_entries_update_program_member
on public.meet_entries
for update
to authenticated
using (
  program_id is not null
  and public.mm_is_program_member(program_id)
)
with check (
  program_id is not null
  and public.mm_is_program_member(program_id)
);

drop policy if exists mm_entries_delete_program_member on public.meet_entries;
create policy mm_entries_delete_program_member
on public.meet_entries
for delete
to authenticated
using (
  program_id is not null
  and public.mm_is_program_member(program_id)
);

-- meet_events
drop policy if exists mm_events_select_meet_program_member on public.meet_events;
create policy mm_events_select_meet_program_member
on public.meet_events
for select
to authenticated
using (public.mm_is_meet_program_member(meet_id));

drop policy if exists mm_events_insert_host_only on public.meet_events;
create policy mm_events_insert_host_only
on public.meet_events
for insert
to authenticated
with check (public.mm_is_meet_host(meet_id));

drop policy if exists mm_events_update_host_only on public.meet_events;
create policy mm_events_update_host_only
on public.meet_events
for update
to authenticated
using (public.mm_is_meet_host(meet_id))
with check (public.mm_is_meet_host(meet_id));

drop policy if exists mm_events_delete_host_only on public.meet_events;
create policy mm_events_delete_host_only
on public.meet_events
for delete
to authenticated
using (public.mm_is_meet_host(meet_id));

-- meet_results (append-only; inserts host-only; selects for meet participants)
drop policy if exists mm_results_select_meet_program_member on public.meet_results;
create policy mm_results_select_meet_program_member
on public.meet_results
for select
to authenticated
using (public.mm_is_meet_program_member(meet_id));

drop policy if exists mm_results_insert_host_only on public.meet_results;
create policy mm_results_insert_host_only
on public.meet_results
for insert
to authenticated
with check (public.mm_is_meet_host(meet_id));

-- ops_tokens (host-managed)
drop policy if exists mm_ops_tokens_select_host_only on public.ops_tokens;
create policy mm_ops_tokens_select_host_only
on public.ops_tokens
for select
to authenticated
using (public.mm_is_meet_host(meet_id));

drop policy if exists mm_ops_tokens_insert_host_only on public.ops_tokens;
create policy mm_ops_tokens_insert_host_only
on public.ops_tokens
for insert
to authenticated
with check (public.mm_is_meet_host(meet_id));

drop policy if exists mm_ops_tokens_update_host_only on public.ops_tokens;
create policy mm_ops_tokens_update_host_only
on public.ops_tokens
for update
to authenticated
using (public.mm_is_meet_host(meet_id))
with check (public.mm_is_meet_host(meet_id));

drop policy if exists mm_ops_tokens_delete_host_only on public.ops_tokens;
create policy mm_ops_tokens_delete_host_only
on public.ops_tokens
for delete
to authenticated
using (public.mm_is_meet_host(meet_id));

-- ops_token_audit (host can read; service_role inserts only)
drop policy if exists mm_ops_audit_select_host_only on public.ops_token_audit;
create policy mm_ops_audit_select_host_only
on public.ops_token_audit
for select
to authenticated
using (
  exists (
    select 1
    from public.ops_tokens ot
    where ot.id = ops_token_id
      and public.mm_is_meet_host(ot.meet_id)
  )
);

drop policy if exists mm_ops_audit_insert_service_role_only on public.ops_token_audit;
create policy mm_ops_audit_insert_service_role_only
on public.ops_token_audit
for insert
to authenticated
with check (public.mm_is_service_role());

-- -----------------------------------------------------------------------------
-- 5) Public read views (public-safe surfaces only)
-- -----------------------------------------------------------------------------

-- Meets overview (minimal fields; safe for discovery)
create or replace view public.public_meet_overview as
select
  m.id,
  m.host_program_id,
  m.meet_type,
  m.lifecycle_state,
  m.start_date,
  m.location,
  m.is_invitational,
  m.created_at
from public.meets m;

-- Live events (state only; no private ops details)
create or replace view public.public_live_events as
select
  e.id,
  e.meet_id,
  e.event_type,
  e.scheduled_at,
  e.xc_state,
  e.tf_state,
  e.field_state,
  e.created_at,
  e.updated_at
from public.meet_events e;

-- Latest published-safe results only
create or replace view public.public_event_results as
select
  r.id,
  r.meet_id,
  r.event_id,
  r.athlete_id,
  r.revision_number,
  r.result_payload,
  r.publication_state,
  r.created_at
from public.meet_results r
where r.publication_state in (
  'published'::public.mm_results_publication_state,
  'final'::public.mm_results_publication_state,
  'revised'::public.mm_results_publication_state
)
and r.revision_number = (
  select max(r2.revision_number)
  from public.meet_results r2
  where r2.event_id = r.event_id
    and r2.athlete_id = r.athlete_id
    and r2.publication_state in (
      'published'::public.mm_results_publication_state,
      'final'::public.mm_results_publication_state,
      'revised'::public.mm_results_publication_state
    )
);

grant select on public.public_meet_overview to anon, authenticated;
grant select on public.public_live_events to anon, authenticated;
grant select on public.public_event_results to anon, authenticated;

commit;
