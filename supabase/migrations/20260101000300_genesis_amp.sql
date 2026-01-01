begin;

create table if not exists public.genesis_athletes (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.genesis_seasons(id) on delete cascade,
  athlete_code text not null,
  athlete_label text not null,
  athlete_profile jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists genesis_athletes_season_code_ux
  on public.genesis_athletes(season_id, athlete_code);

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
  insert into public.genesis_athletes(
    season_id, athlete_code, athlete_label, athlete_profile
  ) values (
    p_season_id, p_athlete_code, p_athlete_label, coalesce(p_athlete_profile, '{}'::jsonb)
  ) returning id into v_id;

  return v_id;
end;
$$;

commit;
