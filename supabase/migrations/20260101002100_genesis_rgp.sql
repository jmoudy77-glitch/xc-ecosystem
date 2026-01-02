begin;

create table if not exists public.genesis_runtime_guardians (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.genesis_seasons(id) on delete cascade,
  plane_key text not null,
  status text not null default 'active',
  last_checked_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists genesis_runtime_guardians_season_plane_ux
  on public.genesis_runtime_guardians(season_id, plane_key);

create or replace function public.genesis_check_and_heal_plane(
  p_season_id uuid,
  p_plane_key text
) returns void
language plpgsql
as $$
declare v_status text;
begin
  select status into v_status
  from public.genesis_runtime_guardians
  where season_id = p_season_id and plane_key = p_plane_key;

  if not found then
    insert into public.genesis_runtime_guardians(season_id, plane_key, status)
    values (p_season_id, p_plane_key, 'active');
  elsif v_status <> 'active' then
    update public.genesis_runtime_guardians
    set status = 'active', last_checked_at = now()
    where season_id = p_season_id and plane_key = p_plane_key;
  else
    update public.genesis_runtime_guardians
    set last_checked_at = now()
    where season_id = p_season_id and plane_key = p_plane_key;
  end if;
end;
$$;

commit;
