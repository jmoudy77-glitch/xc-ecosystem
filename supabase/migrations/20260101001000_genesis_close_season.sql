begin;

alter table public.genesis_seasons
  add column if not exists closed_at timestamptz,
  add column if not exists closed_by uuid;

create index if not exists genesis_seasons_closed_at_idx
  on public.genesis_seasons(closed_at);

create or replace function public.genesis_close_season(
  p_season_id uuid,
  p_closed_by uuid default null
) returns void
language plpgsql
as $$
begin
  update public.genesis_seasons
  set status = 'closed',
      closed_at = now(),
      closed_by = p_closed_by
  where id = p_season_id
    and status <> 'closed';

  if not found then
    raise exception 'season not found or already closed';
  end if;
end;
$$;

create or replace function public.genesis_assert_season_not_closed(
  p_season_id uuid
) returns void
language plpgsql
as $$
begin
  if exists (
    select 1
    from public.genesis_seasons s
    where s.id = p_season_id
      and s.status = 'closed'
  ) then
    raise exception 'season is closed';
  end if;
end;
$$;

create or replace function public.genesis_seal_season(
  p_season_id uuid,
  p_sealed_by uuid default null
) returns void
language plpgsql
as $$
begin
  perform public.genesis_assert_season_not_closed(p_season_id);

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
  perform public.genesis_assert_season_not_closed(p_season_id);

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

commit;
