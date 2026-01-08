-- supabase/migrations/20260109090000_recruiting_slots_team_season_scope_v1.sql

alter table public.recruiting_slot_assignments
  add column if not exists team_season_id uuid references public.team_seasons(id) on delete cascade;

create index if not exists recruiting_slot_assignments_team_season_idx
  on public.recruiting_slot_assignments(program_id, sport, team_season_id);

create index if not exists recruiting_slot_assignments_team_season_slot_idx
  on public.recruiting_slot_assignments(program_id, sport, team_season_id, event_group_key, slot_id);

-- Replace uniqueness constraints to include team_season_id.
drop index if exists recruiting_slot_assignments_slot_athlete_uniq;
drop index if exists recruiting_slot_assignments_recruit_event_group_uniq;
drop index if exists recruiting_slot_assignments_primary_per_slot_uniq;

create unique index if not exists recruiting_slot_assignments_slot_athlete_team_season_uniq
  on public.recruiting_slot_assignments(program_id, sport, team_season_id, event_group_key, slot_id, athlete_id);

create unique index if not exists recruiting_slot_assignments_recruit_event_group_team_season_uniq
  on public.recruiting_slot_assignments(program_id, sport, team_season_id, event_group_key, athlete_id)
  where athlete_type = 'recruit';

create unique index if not exists recruiting_slot_assignments_primary_per_slot_team_season_uniq
  on public.recruiting_slot_assignments(program_id, sport, team_season_id, event_group_key, slot_id)
  where is_primary = true;

create or replace function public.rpc_recruiting_slot_assignments_read_v2(
  p_program_id uuid,
  p_team_season_id uuid,
  p_sport text
)
returns table (
  event_group_key text,
  slot_id text,
  athlete_id uuid,
  athlete_type text,
  is_primary boolean,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    rsa.event_group_key,
    rsa.slot_id,
    rsa.athlete_id,
    rsa.athlete_type,
    rsa.is_primary,
    rsa.created_at
  from public.recruiting_slot_assignments rsa
  where rsa.program_id = p_program_id
    and rsa.team_season_id = p_team_season_id
    and rsa.sport = p_sport
    and exists (
      select 1
      from public.program_members pm
      where pm.program_id = rsa.program_id
        and pm.user_id = auth.uid()
    )
  order by
    rsa.event_group_key asc,
    rsa.slot_id asc,
    rsa.is_primary desc,
    rsa.created_at asc;
$$;

grant execute on function public.rpc_recruiting_slot_assignments_read_v2(
  uuid, uuid, text
) to authenticated;

create or replace function public.rpc_recruiting_slot_presence_read_v2(
  p_program_id uuid,
  p_team_season_id uuid,
  p_sport text
)
returns table (
  event_group_key text,
  slot_id text,
  has_primary boolean
)
language sql
security definer
set search_path = public
as $$
  select
    rsa.event_group_key,
    rsa.slot_id,
    bool_or(rsa.is_primary) as has_primary
  from public.recruiting_slot_assignments rsa
  where rsa.program_id = p_program_id
    and rsa.team_season_id = p_team_season_id
    and rsa.sport = p_sport
    and exists (
      select 1
      from public.program_members pm
      where pm.program_id = rsa.program_id
        and pm.user_id = auth.uid()
    )
  group by
    rsa.event_group_key,
    rsa.slot_id;
$$;

grant execute on function public.rpc_recruiting_slot_presence_read_v2(
  uuid, uuid, text
) to authenticated;

create or replace function public.rpc_recruiting_slot_add_v2(
  p_program_id uuid,
  p_team_season_id uuid,
  p_sport text,
  p_event_group_key text,
  p_slot_id text,
  p_athlete_id uuid,
  p_athlete_type text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_primary boolean;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if p_athlete_type not in ('returning','recruit') then
    raise exception 'invalid_athlete_type';
  end if;

  if p_team_season_id is null then
    raise exception 'team_season_id required';
  end if;

  if not exists (
    select 1
    from public.program_members pm
    where pm.program_id = p_program_id
      and pm.user_id = auth.uid()
  ) then
    raise exception 'forbidden';
  end if;

  if not exists (
    select 1
    from public.team_seasons ts
    join public.teams t on t.id = ts.team_id
    where ts.id = p_team_season_id
      and t.program_id = p_program_id
  ) then
    raise exception 'team_season_mismatch';
  end if;

  select not exists (
    select 1
    from public.recruiting_slot_assignments rsa
    where rsa.program_id = p_program_id
      and rsa.team_season_id = p_team_season_id
      and rsa.sport = p_sport
      and rsa.event_group_key = p_event_group_key
      and rsa.slot_id = p_slot_id
  ) into v_is_primary;

  insert into public.recruiting_slot_assignments (
    program_id,
    team_season_id,
    sport,
    event_group_key,
    slot_id,
    athlete_id,
    athlete_type,
    is_primary
  ) values (
    p_program_id,
    p_team_season_id,
    p_sport,
    p_event_group_key,
    p_slot_id,
    p_athlete_id,
    p_athlete_type,
    v_is_primary
  )
  on conflict do nothing;
end;
$$;

grant execute on function public.rpc_recruiting_slot_add_v2(
  uuid, uuid, text, text, text, uuid, text
) to authenticated;

create or replace function public.rpc_recruiting_slot_remove_v2(
  p_program_id uuid,
  p_team_season_id uuid,
  p_sport text,
  p_event_group_key text,
  p_slot_id text,
  p_athlete_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if p_team_season_id is null then
    raise exception 'team_season_id required';
  end if;

  if not exists (
    select 1
    from public.program_members pm
    where pm.program_id = p_program_id
      and pm.user_id = auth.uid()
  ) then
    raise exception 'forbidden';
  end if;

  if not exists (
    select 1
    from public.team_seasons ts
    join public.teams t on t.id = ts.team_id
    where ts.id = p_team_season_id
      and t.program_id = p_program_id
  ) then
    raise exception 'team_season_mismatch';
  end if;

  select athlete_type into v_type
  from public.recruiting_slot_assignments
  where program_id = p_program_id
    and team_season_id = p_team_season_id
    and sport = p_sport
    and event_group_key = p_event_group_key
    and slot_id = p_slot_id
    and athlete_id = p_athlete_id;

  if v_type = 'returning' then
    return;
  end if;

  delete from public.recruiting_slot_assignments
  where program_id = p_program_id
    and team_season_id = p_team_season_id
    and sport = p_sport
    and event_group_key = p_event_group_key
    and slot_id = p_slot_id
    and athlete_id = p_athlete_id;
end;
$$;

grant execute on function public.rpc_recruiting_slot_remove_v2(
  uuid, uuid, text, text, text, uuid
) to authenticated;

create or replace function public.rpc_recruiting_slot_set_primary_v2(
  p_program_id uuid,
  p_team_season_id uuid,
  p_sport text,
  p_event_group_key text,
  p_slot_id text,
  p_athlete_id uuid,
  p_athlete_type text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_sport text := coalesce(p_sport, 'xc');
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if p_program_id is null
     or p_team_season_id is null
     or p_event_group_key is null
     or p_slot_id is null
     or p_athlete_id is null then
    raise exception 'invalid_input';
  end if;

  if p_athlete_type not in ('returning','recruit') then
    raise exception 'invalid_athlete_type';
  end if;

  if not exists (
    select 1
    from public.program_members pm
    where pm.program_id = p_program_id
      and pm.user_id = v_uid
  ) then
    raise exception 'forbidden';
  end if;

  if not exists (
    select 1
    from public.team_seasons ts
    join public.teams t on t.id = ts.team_id
    where ts.id = p_team_season_id
      and t.program_id = p_program_id
  ) then
    raise exception 'team_season_mismatch';
  end if;

  update public.recruiting_slot_assignments
  set is_primary = false
  where program_id = p_program_id
    and team_season_id = p_team_season_id
    and sport = v_sport
    and event_group_key = p_event_group_key
    and slot_id = p_slot_id
    and is_primary = true;

  insert into public.recruiting_slot_assignments (
    program_id,
    team_season_id,
    sport,
    event_group_key,
    slot_id,
    athlete_id,
    athlete_type,
    is_primary
  ) values (
    p_program_id,
    p_team_season_id,
    v_sport,
    p_event_group_key,
    p_slot_id,
    p_athlete_id,
    p_athlete_type,
    true
  )
  on conflict (program_id, sport, team_season_id, event_group_key, slot_id, athlete_id)
  do update set
    athlete_type = excluded.athlete_type,
    is_primary = true;
end;
$$;

grant execute on function public.rpc_recruiting_slot_set_primary_v2(
  uuid, uuid, text, text, text, uuid, text
) to authenticated;

create or replace function public.rpc_recruiting_slot_reorder_v2(
  p_program_id uuid,
  p_team_season_id uuid,
  p_sport text,
  p_event_group_key text,
  p_slot_id text,
  p_athlete_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if not exists (
    select 1
    from public.program_members pm
    where pm.program_id = p_program_id
      and pm.user_id = auth.uid()
  ) then
    raise exception 'forbidden';
  end if;

  if not exists (
    select 1
    from public.team_seasons ts
    join public.teams t on t.id = ts.team_id
    where ts.id = p_team_season_id
      and t.program_id = p_program_id
  ) then
    raise exception 'team_season_mismatch';
  end if;

  update public.recruiting_slot_assignments rsa
  set updated_at = now()
  where rsa.program_id = p_program_id
    and rsa.team_season_id = p_team_season_id
    and rsa.sport = p_sport
    and rsa.event_group_key = p_event_group_key
    and rsa.slot_id = p_slot_id
    and rsa.athlete_id = any(p_athlete_ids);
end;
$$;

grant execute on function public.rpc_recruiting_slot_reorder_v2(
  uuid, uuid, text, text, text, uuid[]
) to authenticated;

create or replace function public.rpc_recruiting_slot_move_durable_v2(
  p_program_id uuid,
  p_team_season_id uuid,
  p_sport text,
  p_event_group_key text,
  p_slot_id text,
  p_athlete_id uuid,
  p_athlete_type text,
  p_origin_key text,
  p_display_name text,
  p_grad_year int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_group_key text;
begin
  v_event_group_key := public.rpc_recruiting_event_group_canonical_v1(p_event_group_key);

  if v_event_group_key is null then
    raise exception 'event_group_key required';
  end if;

  if p_origin_key not in ('favorites','surfaced') then
    raise exception 'origin_key must be favorites|surfaced';
  end if;

  if coalesce(trim(p_display_name), '') = '' then
    raise exception 'display_name required';
  end if;

  insert into public.recruiting_candidate_cache (
    program_id, sport, athlete_id, display_name, event_group_key, grad_year, updated_at
  )
  values (
    p_program_id, p_sport, p_athlete_id, trim(p_display_name), v_event_group_key, p_grad_year, now()
  )
  on conflict (program_id, sport, athlete_id) do update
  set display_name = excluded.display_name,
      event_group_key = excluded.event_group_key,
      grad_year = excluded.grad_year,
      updated_at = now();

  perform public.rpc_recruiting_slot_add_v2(
    p_program_id := p_program_id,
    p_team_season_id := p_team_season_id,
    p_sport := p_sport,
    p_event_group_key := v_event_group_key,
    p_slot_id := p_slot_id,
    p_athlete_id := p_athlete_id,
    p_athlete_type := p_athlete_type
  );

  insert into public.recruiting_slot_origins (program_id, sport, slot_id, athlete_id, origin_key)
  values (p_program_id, p_sport, p_slot_id, p_athlete_id, p_origin_key)
  on conflict (program_id, sport, slot_id, athlete_id) do update
  set origin_key = excluded.origin_key;

  if p_origin_key = 'favorites' then
    perform public.rpc_recruiting_favorites_delete_v1(
      p_program_id := p_program_id,
      p_sport := p_sport,
      p_athlete_id := p_athlete_id
    );
  end if;
end;
$$;

grant execute on function public.rpc_recruiting_slot_move_durable_v2(
  uuid, uuid, text, text, text, uuid, text, text, text, int
) to authenticated;

create or replace function public.rpc_recruiting_slot_remove_durable_v2(
  p_program_id uuid,
  p_team_season_id uuid,
  p_sport text,
  p_event_group_key text,
  p_slot_id text,
  p_athlete_id uuid,
  p_return_to_origin boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_origin_key text;
  v_event_group_key text;
begin
  v_event_group_key := public.rpc_recruiting_event_group_canonical_v1(p_event_group_key);

  perform public.rpc_recruiting_slot_remove_v2(
    p_program_id := p_program_id,
    p_team_season_id := p_team_season_id,
    p_sport := p_sport,
    p_event_group_key := v_event_group_key,
    p_slot_id := p_slot_id,
    p_athlete_id := p_athlete_id
  );

  select origin_key
    into v_origin_key
  from public.recruiting_slot_origins
  where program_id = p_program_id
    and sport = p_sport
    and slot_id = p_slot_id
    and athlete_id = p_athlete_id;

  if p_return_to_origin is true and v_origin_key = 'favorites' then
    perform public.rpc_recruiting_favorites_upsert_v1(
      p_program_id := p_program_id,
      p_sport := p_sport,
      p_athlete_id := p_athlete_id
    );
  end if;

  delete from public.recruiting_slot_origins
  where program_id = p_program_id
    and sport = p_sport
    and slot_id = p_slot_id
    and athlete_id = p_athlete_id;
end;
$$;

grant execute on function public.rpc_recruiting_slot_remove_durable_v2(
  uuid, uuid, text, text, text, uuid, boolean
) to authenticated;

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
    and rsa.team_season_id = p_team_season_id
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
