create or replace function public.rpc_recruiting_slot_add_v1(
  p_program_id uuid,
  p_sport text,
  p_event_group_key text,
  p_slot_id text,
  p_athlete_id uuid,
  p_athlete_type text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if p_athlete_type not in ('returning','recruit') then
    raise exception 'invalid_athlete_type';
  end if;

  if not exists (
    select 1
    from public.program_members pm
    where pm.program_id = p_program_id
      and pm.user_id = auth.uid()
  ) then
    raise exception 'forbidden';
  end if;

  insert into public.recruiting_slot_assignments (
    program_id,
    sport,
    event_group_key,
    slot_id,
    athlete_id,
    athlete_type,
    is_primary
  ) values (
    p_program_id,
    p_sport,
    p_event_group_key,
    p_slot_id,
    p_athlete_id,
    p_athlete_type,
    false
  )
  on conflict do nothing;
end;
$$;

grant execute on function public.rpc_recruiting_slot_add_v1(
  uuid, text, text, text, uuid, text
) to authenticated;

create or replace function public.rpc_recruiting_slot_remove_v1(
  p_program_id uuid,
  p_sport text,
  p_event_group_key text,
  p_slot_id text,
  p_athlete_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if not exists (
    select 1
    from public.program_members pm
    where pm.program_id = p_program_id
      and pm.user_id = auth.uid()
  ) then
    raise exception 'forbidden';
  end if;

  select athlete_type into v_type
  from public.recruiting_slot_assignments
  where program_id = p_program_id
    and sport = p_sport
    and event_group_key = p_event_group_key
    and slot_id = p_slot_id
    and athlete_id = p_athlete_id;

  if v_type = 'returning' then
    return;
  end if;

  delete from public.recruiting_slot_assignments
  where program_id = p_program_id
    and sport = p_sport
    and event_group_key = p_event_group_key
    and slot_id = p_slot_id
    and athlete_id = p_athlete_id;
end;
$$;

grant execute on function public.rpc_recruiting_slot_remove_v1(
  uuid, text, text, text, uuid
) to authenticated;

create or replace function public.rpc_recruiting_slot_reorder_v1(
  p_program_id uuid,
  p_sport text,
  p_event_group_key text,
  p_slot_id text,
  p_athlete_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_i int := 1;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if not exists (
    select 1
    from public.program_members pm
    where pm.program_id = p_program_id
      and pm.user_id = auth.uid()
  ) then
    raise exception 'forbidden';
  end if;

  foreach v_id in array p_athlete_ids loop
    update public.recruiting_slot_assignments
    set position = v_i
    where program_id = p_program_id
      and sport = p_sport
      and event_group_key = p_event_group_key
      and slot_id = p_slot_id
      and athlete_id = v_id;

    v_i := v_i + 1;
  end loop;
end;
$$;

grant execute on function public.rpc_recruiting_slot_reorder_v1(
  uuid, text, text, text, uuid[]
) to authenticated;
