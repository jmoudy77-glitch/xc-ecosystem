-- supabase/migrations/20260108190000_recruiting_durable_slot_moves.sql

-- 1) Durable candidate label cache (prevents UI label degradation)
create table if not exists public.recruiting_candidate_cache (
  program_id uuid not null references public.programs(id) on delete cascade,
  sport text not null,
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  display_name text not null,
  event_group_key text not null,
  grad_year int null,
  updated_at timestamptz not null default now(),
  primary key (program_id, sport, athlete_id)
);

-- 2) Durable origin tracking for any slotted athlete
create table if not exists public.recruiting_slot_origins (
  program_id uuid not null references public.programs(id) on delete cascade,
  sport text not null,
  slot_id text not null,
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  origin_key text not null check (origin_key in ('favorites','surfaced')),
  created_at timestamptz not null default now(),
  primary key (program_id, sport, slot_id, athlete_id)
);

-- Helper: canonicalize event group key
create or replace function public.rpc_recruiting_event_group_canonical_v1(p_value text)
returns text
language sql
immutable
as $$
  select case
    when p_value is null then null
    when lower(p_value) like '%sprint%' then 'sprint'
    when lower(p_value) like '%mid%' then 'mid'
    when lower(p_value) like '%distance%' then 'distance'
    else regexp_replace(lower(p_value), '\s+', '', 'g')
  end
$$;

-- 3) Durable atomic move into slot (calls existing stable RPCs; does not alter them)
create or replace function public.rpc_recruiting_slot_move_durable_v1(
  p_program_id uuid,
  p_sport text,
  p_event_group_key text,
  p_slot_id text,
  p_athlete_id uuid,
  p_athlete_type text,
  p_origin_key text,
  p_display_name text,
  p_grad_year int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_group_key text;
begin
  v_event_group_key := public.rpc_recruiting_event_group_canonical_v1(p_event_group_key);

  if v_event_group_key is null then
    raise exception 'event_group_key required';
  end if;

  if p_origin_key not in ('favorites','surfaced') then
    raise exception 'origin_key must be favorites|surfaced';
  end if;

  if coalesce(trim(p_display_name), '') = '' then
    raise exception 'display_name required';
  end if;

  -- upsert candidate cache for durable labels
  insert into public.recruiting_candidate_cache (
    program_id, sport, athlete_id, display_name, event_group_key, grad_year, updated_at
  )
  values (
    p_program_id, p_sport, p_athlete_id, trim(p_display_name), v_event_group_key, p_grad_year, now()
  )
  on conflict (program_id, sport, athlete_id) do update
  set display_name = excluded.display_name,
      event_group_key = excluded.event_group_key,
      grad_year = excluded.grad_year,
      updated_at = now();

  -- persist slot assignment using existing canonical RPC
  perform public.rpc_recruiting_slot_add_v1(
    p_program_id := p_program_id,
    p_sport := p_sport,
    p_event_group_key := v_event_group_key,
    p_slot_id := p_slot_id,
    p_athlete_id := p_athlete_id,
    p_athlete_type := p_athlete_type
  );

  -- record durable origin for return-to-origin
  insert into public.recruiting_slot_origins (program_id, sport, slot_id, athlete_id, origin_key)
  values (p_program_id, p_sport, p_slot_id, p_athlete_id, p_origin_key)
  on conflict (program_id, sport, slot_id, athlete_id) do update
  set origin_key = excluded.origin_key;

  -- while placed: suppress in favorites server-authoritatively if origin=favorites
  if p_origin_key = 'favorites' then
    perform public.rpc_recruiting_favorites_delete_v1(
      p_program_id := p_program_id,
      p_sport := p_sport,
      p_athlete_id := p_athlete_id
    );
  end if;
end;
$$;

-- 4) Durable slot remove with return-to-origin (favorites server-authoritative)
create or replace function public.rpc_recruiting_slot_remove_durable_v1(
  p_program_id uuid,
  p_sport text,
  p_event_group_key text,
  p_slot_id text,
  p_athlete_id uuid,
  p_return_to_origin boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_origin_key text;
  v_event_group_key text;
begin
  v_event_group_key := public.rpc_recruiting_event_group_canonical_v1(p_event_group_key);

  -- remove slot assignment using existing canonical RPC
  perform public.rpc_recruiting_slot_remove_v1(
    p_program_id := p_program_id,
    p_sport := p_sport,
    p_event_group_key := v_event_group_key,
    p_slot_id := p_slot_id,
    p_athlete_id := p_athlete_id
  );

  select origin_key
    into v_origin_key
  from public.recruiting_slot_origins
  where program_id = p_program_id
    and sport = p_sport
    and slot_id = p_slot_id
    and athlete_id = p_athlete_id;

  if p_return_to_origin is true and v_origin_key = 'favorites' then
    perform public.rpc_recruiting_favorites_upsert_v1(
      p_program_id := p_program_id,
      p_sport := p_sport,
      p_athlete_id := p_athlete_id
    );
  end if;

  delete from public.recruiting_slot_origins
  where program_id = p_program_id
    and sport = p_sport
    and slot_id = p_slot_id
    and athlete_id = p_athlete_id;
end;
$$;

grant execute on function public.rpc_recruiting_slot_move_durable_v1(uuid,text,text,text,uuid,text,text,text,int) to authenticated;
grant execute on function public.rpc_recruiting_slot_remove_durable_v1(uuid,text,text,text,uuid,boolean) to authenticated;
grant execute on function public.rpc_recruiting_event_group_canonical_v1(text) to authenticated;
