begin;

create table if not exists public.genesis_runtime_planes (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.genesis_seasons(id) on delete cascade,
  plane_key text not null,
  plane_state jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists genesis_runtime_planes_season_key_ux
  on public.genesis_runtime_planes(season_id, plane_key);

create or replace function public.genesis_register_runtime_plane(
  p_season_id uuid,
  p_plane_key text,
  p_plane_state jsonb default '{}'::jsonb,
  p_is_active boolean default true
) returns uuid
language plpgsql
as $$
declare v_id uuid;
begin
  insert into public.genesis_runtime_planes(
    season_id, plane_key, plane_state, is_active
  ) values (
    p_season_id, p_plane_key, coalesce(p_plane_state,'{}'::jsonb), coalesce(p_is_active,true)
  )
  on conflict (season_id, plane_key) do update
    set plane_state = excluded.plane_state,
        is_active = excluded.is_active
  returning id into v_id;

  return v_id;
end;
$$;

commit;
