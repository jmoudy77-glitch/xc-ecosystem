begin;

create table if not exists public.genesis_roster_bindings (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.genesis_seasons(id) on delete cascade,
  team_id uuid not null references public.genesis_teams(id) on delete cascade,
  athlete_id uuid not null references public.genesis_athletes(id) on delete cascade,
  binding_role text not null default 'member',
  binding_meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists genesis_roster_bindings_team_athlete_ux
  on public.genesis_roster_bindings(team_id, athlete_id);

create index if not exists genesis_roster_bindings_season_id_idx
  on public.genesis_roster_bindings(season_id);

create index if not exists genesis_roster_bindings_team_id_idx
  on public.genesis_roster_bindings(team_id);

create index if not exists genesis_roster_bindings_athlete_id_idx
  on public.genesis_roster_bindings(athlete_id);

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
