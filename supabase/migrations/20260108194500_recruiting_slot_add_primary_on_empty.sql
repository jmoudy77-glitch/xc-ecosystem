-- supabase/migrations/20260108194500_recruiting_slot_add_primary_on_empty.sql

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
declare
  v_is_primary boolean;
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

  select not exists (
    select 1
    from public.recruiting_slot_assignments rsa
    where rsa.program_id = p_program_id
      and rsa.sport = p_sport
      and rsa.event_group_key = p_event_group_key
      and rsa.slot_id = p_slot_id
  ) into v_is_primary;

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
    v_is_primary
  )
  on conflict do nothing;
end;
$$;

grant execute on function public.rpc_recruiting_slot_add_v1(
  uuid, text, text, text, uuid, text
) to authenticated;
