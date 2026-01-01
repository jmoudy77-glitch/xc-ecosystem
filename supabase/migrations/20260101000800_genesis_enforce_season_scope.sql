begin;

create or replace function public.genesis_assert_team_in_season(
  p_season_id uuid,
  p_team_id uuid
) returns void
language plpgsql
as $$
begin
  if not exists (
    select 1
    from public.genesis_teams t
    where t.id = p_team_id
      and t.season_id = p_season_id
  ) then
    raise exception 'team_id not in season';
  end if;
end;
$$;

create or replace function public.genesis_assert_athlete_in_season(
  p_season_id uuid,
  p_athlete_id uuid
) returns void
language plpgsql
as $$
begin
  if not exists (
    select 1
    from public.genesis_athletes a
    where a.id = p_athlete_id
      and a.season_id = p_season_id
  ) then
    raise exception 'athlete_id not in season';
  end if;
end;
$$;

create or replace function public.genesis_bind_roster(
  p_season_id uuid,
  p_team_id uuid,
  p_athlete_id uuid,
  p_binding_role text default 'member',
  p_binding_meta jsonb default '{}'::jsonb
) returns uuid
language plpgsql
as $$
declare v_id uuid;
begin
  perform public.genesis_assert_team_in_season(p_season_id, p_team_id);
  perform public.genesis_assert_athlete_in_season(p_season_id, p_athlete_id);

  insert into public.genesis_roster_bindings(
    season_id, team_id, athlete_id, binding_role, binding_meta
  ) values (
    p_season_id, p_team_id, p_athlete_id, coalesce(p_binding_role,'member'), coalesce(p_binding_meta,'{}'::jsonb)
  )
  on conflict (team_id, athlete_id) do update
    set binding_role = excluded.binding_role,
        binding_meta = excluded.binding_meta
  returning id into v_id;

  return v_id;
end;
$$;

commit;
