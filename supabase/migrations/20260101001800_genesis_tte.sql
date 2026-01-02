begin;

create table if not exists public.genesis_time_ticks (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.genesis_seasons(id) on delete cascade,
  tick_at timestamptz not null,
  tick_index bigint not null,
  created_at timestamptz not null default now()
);

create unique index if not exists genesis_time_ticks_season_tick_ux
  on public.genesis_time_ticks(season_id, tick_index);

create or replace function public.genesis_emit_tick(
  p_season_id uuid,
  p_tick_at timestamptz default now()
) returns bigint
language plpgsql
as $$
declare v_idx bigint;
begin
  select coalesce(max(t.tick_index),0)+1
    into v_idx
    from public.genesis_time_ticks t
    where t.season_id = p_season_id;

  insert into public.genesis_time_ticks(season_id, tick_at, tick_index)
  values (p_season_id, p_tick_at, v_idx);

  return v_idx;
end;
$$;

commit;
