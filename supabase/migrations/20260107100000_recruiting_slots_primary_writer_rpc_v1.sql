create or replace function public.rpc_recruiting_slot_set_primary_v1(
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
declare
  v_uid uuid := auth.uid();
  v_sport text := coalesce(p_sport, 'xc');
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if p_program_id is null
     or p_event_group_key is null
     or p_slot_id is null
     or p_athlete_id is null then
    raise exception 'invalid_input';
  end if;

  if p_athlete_type not in ('returning','recruit') then
    raise exception 'invalid_athlete_type';
  end if;

  if not exists (
    select 1
    from public.program_members pm
    where pm.program_id = p_program_id
      and pm.user_id = v_uid
  ) then
    raise exception 'forbidden';
  end if;

  update public.recruiting_slot_assignments
  set is_primary = false
  where program_id = p_program_id
    and sport = v_sport
    and event_group_key = p_event_group_key
    and slot_id = p_slot_id
    and is_primary = true;

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
    v_sport,
    p_event_group_key,
    p_slot_id,
    p_athlete_id,
    p_athlete_type,
    true
  )
  on conflict (program_id, sport, event_group_key, slot_id, athlete_id)
  do update set
    athlete_type = excluded.athlete_type,
    is_primary = true;
end;
$$;

grant execute on function public.rpc_recruiting_slot_set_primary_v1(
  uuid, text, text, text, uuid, text
) to authenticated;
