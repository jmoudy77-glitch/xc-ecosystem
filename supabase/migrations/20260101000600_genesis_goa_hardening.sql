begin;

alter table public.genesis_seasons
  add column if not exists minted_at timestamptz not null default now();

alter table public.genesis_seasons
  add column if not exists minted_by uuid;

create index if not exists genesis_seasons_minted_at_idx
  on public.genesis_seasons(minted_at);

create or replace function public.genesis_mint_season(
  p_program_id uuid,
  p_season_code text,
  p_season_label text,
  p_window_start date,
  p_window_end date,
  p_sport_phase text,
  p_default_compute_profile jsonb,
  p_default_sealing_policy jsonb,
  p_created_by uuid default null
)
returns uuid
language plpgsql
as $$
declare
  v_season_id uuid;
begin
  if p_program_id is null then
    raise exception 'program_id is required';
  end if;

  if p_season_code is null or length(trim(p_season_code)) = 0 then
    raise exception 'season_code is required';
  end if;

  if p_season_label is null or length(trim(p_season_label)) = 0 then
    raise exception 'season_label is required';
  end if;

  if p_window_start is null or p_window_end is null then
    raise exception 'window_start and window_end are required';
  end if;

  if p_window_end < p_window_start then
    raise exception 'window_end must be >= window_start';
  end if;

  if p_sport_phase is null or length(trim(p_sport_phase)) = 0 then
    raise exception 'sport_phase is required';
  end if;

  insert into public.genesis_seasons (
    program_id,
    season_code,
    season_label,
    window_start,
    window_end,
    sport_phase,
    default_compute_profile,
    default_sealing_policy,
    minted_at,
    minted_by,
    created_by
  )
  values (
    p_program_id,
    trim(p_season_code),
    trim(p_season_label),
    p_window_start,
    p_window_end,
    trim(p_sport_phase),
    coalesce(p_default_compute_profile, '{}'::jsonb),
    coalesce(p_default_sealing_policy, '{}'::jsonb),
    now(),
    p_created_by,
    p_created_by
  )
  returning id into v_season_id;

  insert into public.genesis_season_pipelines (season_id, pipeline_key, pipeline_config)
  values
    (v_season_id, 'compute', jsonb_build_object('profile', coalesce(p_default_compute_profile, '{}'::jsonb))),
    (v_season_id, 'ingestion', jsonb_build_object('profile', coalesce(p_default_compute_profile, '{}'::jsonb)))
  on conflict do nothing;

  insert into public.genesis_season_governance_planes (season_id, plane_key, plane_config)
  values
    (v_season_id, 'governance', jsonb_build_object('sealing_policy', coalesce(p_default_sealing_policy, '{}'::jsonb))),
    (v_season_id, 'telemetry', '{}'::jsonb),
    (v_season_id, 'authority', '{}'::jsonb)
  on conflict do nothing;

  insert into public.genesis_season_lifecycle_hooks (season_id, hook_key, hook_config)
  values
    (v_season_id, 'on_open', '{}'::jsonb),
    (v_season_id, 'on_tick', '{}'::jsonb),
    (v_season_id, 'on_close', '{}'::jsonb)
  on conflict do nothing;

  insert into public.genesis_season_surfaces (season_id, surface_key, surface_config, is_open)
  values
    (v_season_id, 'season_world', '{}'::jsonb, true),
    (v_season_id, 'governance_plane', '{}'::jsonb, true),
    (v_season_id, 'pipeline_plane', '{}'::jsonb, true)
  on conflict do nothing;

  return v_season_id;
exception
  when unique_violation then
    raise exception 'season_code already exists for program';
end;
$$;

revoke all on function public.genesis_mint_season(uuid,text,text,date,date,text,jsonb,jsonb,uuid) from public;
grant execute on function public.genesis_mint_season(uuid,text,text,date,date,text,jsonb,jsonb,uuid) to authenticated;
grant execute on function public.genesis_mint_season(uuid,text,text,date,date,text,jsonb,jsonb,uuid) to service_role;

commit;
