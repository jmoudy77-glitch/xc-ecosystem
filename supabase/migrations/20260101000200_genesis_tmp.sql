begin;

create table if not exists public.genesis_teams (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.genesis_seasons(id) on delete cascade,
  team_code text not null,
  team_label text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists genesis_teams_season_code_ux
  on public.genesis_teams(season_id, team_code);

create or replace function public.genesis_mint_team(
  p_season_id uuid,
  p_team_code text,
  p_team_label text
) returns uuid
language plpgsql
as $$
declare v_id uuid;
begin
  insert into public.genesis_teams(
    season_id, team_code, team_label
  ) values (
    p_season_id, p_team_code, p_team_label
  ) returning id into v_id;
  return v_id;
end;
$$;

commit;
