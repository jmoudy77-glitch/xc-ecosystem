-- supabase/migrations/20260108140000_roster_planning_recruiting_sync_v1.sql

begin;

create table if not exists public.roster_planning_state (
  team_season_id uuid primary key references public.team_seasons(id) on delete cascade,
  is_locked boolean not null default false,
  auto_sync_on_open boolean not null default true,
  locked_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.roster_planning_slot_assignments (
  id uuid primary key default gen_random_uuid(),
  team_season_id uuid not null references public.team_seasons(id) on delete cascade,
  program_id uuid not null references public.programs(id),
  sport text not null check (sport in ('xc','tf')),
  event_group_key text not null,
  slot_id text not null,
  athlete_id uuid not null references public.athletes(id),
  athlete_type text not null check (athlete_type in ('returning','recruit')),
  is_primary boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_season_id, sport, event_group_key, slot_id, athlete_id)
);

create index if not exists idx_roster_planning_slot_assignments_slot
  on public.roster_planning_slot_assignments (team_season_id, sport, event_group_key, slot_id, position);

create or replace function public._roster_planning_require_team_season_access_v1(p_team_season_id uuid)
returns table(program_id uuid, user_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_program_id uuid;
  v_user_id uuid;
begin
  select ts.program_id into v_program_id
  from public.team_seasons ts
  where ts.id = p_team_season_id;

  if v_program_id is null then
    raise exception 'team_season not found';
  end if;

  select u.id into v_user_id
  from public.users u
  where u.auth_id = auth.uid();

  if v_user_id is null then
    raise exception 'user not found';
  end if;

  if not exists (
    select 1
    from public.program_members pm
    where pm.program_id = v_program_id
      and pm.user_id = v_user_id
  ) then
    raise exception 'forbidden';
  end if;

  program_id := v_program_id;
  user_id := v_user_id;
  return next;
end;
$$;

create or replace function public.rpc_roster_planning_sync_from_recruiting_v1(
  p_team_season_id uuid,
  p_sport text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_program_id uuid;
  v_now timestamptz := now();
begin
  if p_sport not in ('xc','tf') then
    raise exception 'invalid sport';
  end if;

  select program_id into v_program_id
  from public._roster_planning_require_team_season_access_v1(p_team_season_id);

  insert into public.roster_planning_state(team_season_id)
  values (p_team_season_id)
  on conflict (team_season_id) do nothing;

  delete from public.roster_planning_slot_assignments a
  where a.team_season_id = p_team_season_id
    and a.sport = p_sport;

  insert into public.roster_planning_slot_assignments (
    team_season_id,
    program_id,
    sport,
    event_group_key,
    slot_id,
    athlete_id,
    athlete_type,
    is_primary,
    position
  )
  select
    p_team_season_id,
    rsa.program_id,
    rsa.sport,
    rsa.event_group_key,
    rsa.slot_id,
    rsa.athlete_id,
    rsa.athlete_type,
    rsa.is_primary,
    (row_number() over (
      partition by rsa.event_group_key, rsa.slot_id
      order by rsa.is_primary desc, rsa.created_at asc, rsa.athlete_id asc
    ) * 10)::int as position
  from public.recruiting_slot_assignments rsa
  where rsa.program_id = v_program_id
    and rsa.sport = p_sport;

  update public.roster_planning_state
  set last_synced_at = v_now,
      updated_at = v_now
  where team_season_id = p_team_season_id;

  return jsonb_build_object(
    'ok', true,
    'teamSeasonId', p_team_season_id,
    'sport', p_sport,
    'syncedAt', v_now
  );
end;
$$;

create or replace function public.rpc_roster_planning_set_lock_state_v1(
  p_team_season_id uuid,
  p_is_locked boolean,
  p_sync_with_recruiting boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_program_id uuid;
  v_now timestamptz := now();
  v_team_sport text;
begin
  select program_id into v_program_id
  from public._roster_planning_require_team_season_access_v1(p_team_season_id);

  select t.sport into v_team_sport
  from public.team_seasons ts
  join public.teams t on t.id = ts.team_id
  where ts.id = p_team_season_id;

  if v_team_sport is null then
    raise exception 'team sport not found';
  end if;

  insert into public.roster_planning_state(team_season_id)
  values (p_team_season_id)
  on conflict (team_season_id) do nothing;

  update public.roster_planning_state
  set is_locked = p_is_locked,
      auto_sync_on_open = case
        when p_is_locked then false
        else p_sync_with_recruiting
      end,
      locked_at = case
        when p_is_locked then coalesce(locked_at, v_now)
        else null
      end,
      updated_at = v_now
  where team_season_id = p_team_season_id;

  if (not p_is_locked) and p_sync_with_recruiting then
    perform public.rpc_roster_planning_sync_from_recruiting_v1(p_team_season_id, v_team_sport);
  end if;

  return jsonb_build_object(
    'ok', true,
    'teamSeasonId', p_team_season_id,
    'isLocked', p_is_locked,
    'autoSyncOnOpen', (select auto_sync_on_open from public.roster_planning_state where team_season_id = p_team_season_id)
  );
end;
$$;

create or replace function public.rpc_roster_planning_slots_read_v1(
  p_team_season_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_program_id uuid;
  v_now timestamptz := now();
  v_roster_lock_date timestamptz;
  v_team_sport text;
  v_state record;
  v_auto_locked boolean := false;
begin
  select program_id into v_program_id
  from public._roster_planning_require_team_season_access_v1(p_team_season_id);

  select ts.roster_lock_date, t.sport
  into v_roster_lock_date, v_team_sport
  from public.team_seasons ts
  join public.teams t on t.id = ts.team_id
  where ts.id = p_team_season_id;

  if v_team_sport is null then
    raise exception 'team sport not found';
  end if;

  insert into public.roster_planning_state(team_season_id)
  values (p_team_season_id)
  on conflict (team_season_id) do nothing;

  select * into v_state
  from public.roster_planning_state
  where team_season_id = p_team_season_id;

  if v_roster_lock_date is not null and v_now >= v_roster_lock_date then
    if v_state.is_locked = false then
      v_auto_locked := true;
      update public.roster_planning_state
      set is_locked = true,
          auto_sync_on_open = false,
          locked_at = coalesce(locked_at, v_now),
          updated_at = v_now
      where team_season_id = p_team_season_id;

      select * into v_state
      from public.roster_planning_state
      where team_season_id = p_team_season_id;
    end if;
  end if;

  if v_state.is_locked = false and v_state.auto_sync_on_open = true then
    perform public.rpc_roster_planning_sync_from_recruiting_v1(p_team_season_id, v_team_sport);
  end if;

  return jsonb_build_object(
    'ok', true,
    'teamSeasonId', p_team_season_id,
    'programId', v_program_id,
    'sport', v_team_sport,
    'rosterLockDate', v_roster_lock_date,
    'state', jsonb_build_object(
      'isLocked', v_state.is_locked,
      'autoSyncOnOpen', v_state.auto_sync_on_open,
      'lockedAt', v_state.locked_at,
      'lastSyncedAt', v_state.last_synced_at,
      'autoLockedThisRead', v_auto_locked
    ),
    'assignments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'eventGroupKey', a.event_group_key,
        'slotId', a.slot_id,
        'athleteId', a.athlete_id,
        'athleteType', a.athlete_type,
        'isPrimary', a.is_primary,
        'position', a.position,
        'displayName', (aa.first_name || ' ' || aa.last_name),
        'avatarUrl', aa.avatar_url,
        'gradYear', aa.grad_year
      ) order by a.event_group_key, a.slot_id, a.position)
      from public.roster_planning_slot_assignments a
      join public.athletes aa on aa.id = a.athlete_id
      where a.team_season_id = p_team_season_id
        and a.sport = v_team_sport
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.rpc_roster_planning_reorder_within_slot_v1(
  p_team_season_id uuid,
  p_event_group_key text,
  p_slot_id text,
  p_athlete_id uuid,
  p_before_athlete_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_program_id uuid;
  v_now timestamptz := now();
  v_team_sport text;
  v_is_locked boolean;
begin
  select program_id into v_program_id
  from public._roster_planning_require_team_season_access_v1(p_team_season_id);

  select t.sport into v_team_sport
  from public.team_seasons ts
  join public.teams t on t.id = ts.team_id
  where ts.id = p_team_season_id;

  if v_team_sport is null then
    raise exception 'team sport not found';
  end if;

  select is_locked into v_is_locked
  from public.roster_planning_state
  where team_season_id = p_team_season_id;

  if coalesce(v_is_locked, false) then
    raise exception 'locked';
  end if;

  if not exists (
    select 1
    from public.roster_planning_slot_assignments a
    where a.team_season_id = p_team_season_id
      and a.sport = v_team_sport
      and a.event_group_key = p_event_group_key
      and a.slot_id = p_slot_id
      and a.athlete_id = p_athlete_id
  ) then
    raise exception 'athlete not in slot';
  end if;

  with current_list as (
    select a.athlete_id
    from public.roster_planning_slot_assignments a
    where a.team_season_id = p_team_season_id
      and a.sport = v_team_sport
      and a.event_group_key = p_event_group_key
      and a.slot_id = p_slot_id
    order by a.position asc, a.created_at asc, a.athlete_id asc
  ),
  removed as (
    select athlete_id from current_list where athlete_id <> p_athlete_id
  ),
  inserted as (
    select
      case
        when p_before_athlete_id is null then null::uuid
        else p_before_athlete_id
      end as before_id
  ),
  rebuilt as (
    select
      row_number() over () as rn,
      athlete_id
    from (
      select r.athlete_id
      from removed r, inserted i
      where i.before_id is null

      union all

      select r2.athlete_id
      from removed r2
      where r2.athlete_id <> coalesce((select before_id from inserted), '00000000-0000-0000-0000-000000000000'::uuid)

      union all

      select (select before_id from inserted) as athlete_id
      where (select before_id from inserted) is not null

      union all

      select p_athlete_id as athlete_id
      where (select before_id from inserted) is not null

      union all

      select r3.athlete_id
      from removed r3
      where r3.athlete_id = (select before_id from inserted)
    ) x
    where x.athlete_id is not null
  ),
  dedup as (
    select distinct on (athlete_id) athlete_id, rn
    from rebuilt
    order by athlete_id, rn
  ),
  final_order as (
    select
      row_number() over (order by d.rn) as seq,
      d.athlete_id
    from dedup d
    where d.athlete_id is not null
  )
  update public.roster_planning_slot_assignments a
  set position = (f.seq * 10)::int,
      updated_at = v_now
  from final_order f
  where a.team_season_id = p_team_season_id
    and a.sport = v_team_sport
    and a.event_group_key = p_event_group_key
    and a.slot_id = p_slot_id
    and a.athlete_id = f.athlete_id;

  return jsonb_build_object(
    'ok', true,
    'teamSeasonId', p_team_season_id,
    'sport', v_team_sport,
    'eventGroupKey', p_event_group_key,
    'slotId', p_slot_id,
    'athleteId', p_athlete_id,
    'beforeAthleteId', p_before_athlete_id
  );
end;
$$;

commit;
