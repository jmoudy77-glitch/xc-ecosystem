create or replace function public.rpc_recruiting_favorites_delete_v1(
  p_program_id uuid,
  p_sport text,
  p_athlete_id uuid
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

  if not exists (
    select 1
    from public.program_members pm
    where pm.program_id = p_program_id
      and pm.user_id = auth.uid()
  ) then
    raise exception 'forbidden';
  end if;

  delete from public.recruiting_favorites rf
  where rf.program_id = p_program_id
    and rf.sport = p_sport
    and rf.athlete_id = p_athlete_id;
end;
$$;

grant execute on function public.rpc_recruiting_favorites_delete_v1(
  uuid, text, uuid
) to authenticated;

create or replace function public.rpc_recruiting_favorites_reorder_v1(
  p_program_id uuid,
  p_sport text,
  p_athlete_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_i int := 1;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if p_program_id is null or p_sport is null or p_athlete_ids is null then
    raise exception 'invalid_input';
  end if;

  if not exists (
    select 1
    from public.program_members pm
    where pm.program_id = p_program_id
      and pm.user_id = v_uid
  ) then
    raise exception 'forbidden';
  end if;

  foreach v_id in array p_athlete_ids loop
    update public.recruiting_favorites rf
    set "position" = v_i
    where rf.program_id = p_program_id
      and rf.sport = p_sport
      and rf.athlete_id = v_id;

    v_i := v_i + 1;
  end loop;
end;
$$;

grant execute on function public.rpc_recruiting_favorites_reorder_v1(
  uuid, text, uuid[]
) to authenticated;
