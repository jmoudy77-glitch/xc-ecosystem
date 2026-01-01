begin;

create extension if not exists pgcrypto;

create table if not exists public.genesis_seasons (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null,
  season_code text not null,
  season_label text not null,
  window_start date not null,
  window_end date not null,
  sport_phase text not null,
  default_compute_profile jsonb not null default '{}'::jsonb,
  default_sealing_policy jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists genesis_seasons_program_code_ux
  on public.genesis_seasons(program_id, season_code);

create or replace function public.genesis_mint_season(
  p_program_id uuid,
  p_season_code text,
  p_season_label text,
  p_window_start date,
  p_window_end date,
  p_sport_phase text,
  p_default_compute_profile jsonb,
  p_default_sealing_policy jsonb
) returns uuid
language plpgsql
as $$
declare v_id uuid;
begin
  insert into public.genesis_seasons(
    program_id, season_code, season_label,
    window_start, window_end, sport_phase,
    default_compute_profile, default_sealing_policy
  ) values (
    p_program_id, p_season_code, p_season_label,
    p_window_start, p_window_end, p_sport_phase,
    coalesce(p_default_compute_profile,'{}'::jsonb),
    coalesce(p_default_sealing_policy,'{}'::jsonb)
  ) returning id into v_id;
  return v_id;
end;
$$;

commit;
