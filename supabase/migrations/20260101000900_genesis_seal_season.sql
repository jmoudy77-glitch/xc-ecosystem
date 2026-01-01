begin;

alter table public.genesis_seasons
  add column if not exists sealed_at timestamptz,
  add column if not exists sealed_by uuid;

create index if not exists genesis_seasons_sealed_at_idx
  on public.genesis_seasons(sealed_at);

create or replace function public.genesis_seal_season(
  p_season_id uuid,
  p_sealed_by uuid default null
) returns void
language plpgsql
as $$
begin
  update public.genesis_seasons
  set status = 'sealed',
      sealed_at = now(),
      sealed_by = p_sealed_by
  where id = p_season_id
    and status <> 'sealed';

  if not found then
    raise exception 'season not found or already sealed';
  end if;
end;
$$;

create or replace function public.genesis_assert_season_open(
  p_season_id uuid
) returns void
language plpgsql
as $$
begin
  if exists (
    select 1
    from public.genesis_seasons s
    where s.id = p_season_id
      and s.status = 'sealed'
  ) then
    raise exception 'season is sealed';
  end if;
end;
$$;

create or replace function public.genesis_mint_team(
  p_season_id uuid,
  p_team_code text,
  p_team_label text
) returns uuid
language plpgsql
as $$
declare v_id uuid;
begin
  perform public.genesis_assert_season_open(p_season_id);

  insert into public.genesis_teams(
    season_id, team_code, team_label
  ) values (
    p_season_id, p_team_code, p_team_label
  ) returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.genesis_mint_athlete(
  p_season_id uuid,
  p_athlete_code text,
  p_athlete_label text,
  p_athlete_profile jsonb default '{}'::jsonb
) returns uuid
language plpgsql
as $$
declare v_id uuid;
begin
  perform public.genesis_assert_season_open(p_season_id);

  insert into public.genesis_athletes(
    season_id, athlete_code, athlete_label, athlete_profile
  ) values (
    p_season_id, p_athlete_code, p_athlete_label, coalesce(p_athlete_profile, '{}'::jsonb)
  ) returning id into v_id;

  return v_id;
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
  perform public.genesis_assert_season_open(p_season_id);
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
