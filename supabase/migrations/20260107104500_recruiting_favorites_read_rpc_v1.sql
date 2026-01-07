create or replace function public.rpc_recruiting_favorites_read_v1(
  p_program_id uuid,
  p_sport text
)
returns table (
  athlete_id uuid,
  "position" int,
  pinned boolean,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    rf.athlete_id,
    rf.position as "position",
    rf.pinned,
    rf.created_at
  from public.recruiting_favorites rf
  where rf.program_id = p_program_id
    and rf.sport = p_sport
    and exists (
      select 1
      from public.program_members pm
      where pm.program_id = rf.program_id
        and pm.user_id = auth.uid()
    )
  order by
    rf.pinned desc,
    rf.position asc,
    rf.created_at asc;
$$;

grant execute on function public.rpc_recruiting_favorites_read_v1(
  uuid, text
) to authenticated;
