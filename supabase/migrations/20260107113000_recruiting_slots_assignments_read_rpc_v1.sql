create or replace function public.rpc_recruiting_slot_assignments_read_v1(
  p_program_id uuid,
  p_sport text
)
returns table (
  event_group_key text,
  slot_id text,
  athlete_id uuid,
  athlete_type text,
  is_primary boolean,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    rsa.event_group_key,
    rsa.slot_id,
    rsa.athlete_id,
    rsa.athlete_type,
    rsa.is_primary,
    rsa.created_at
  from public.recruiting_slot_assignments rsa
  where rsa.program_id = p_program_id
    and rsa.sport = p_sport
    and exists (
      select 1
      from public.program_members pm
      where pm.program_id = rsa.program_id
        and pm.user_id = auth.uid()
    )
  order by
    rsa.event_group_key asc,
    rsa.slot_id asc,
    rsa.is_primary desc,
    rsa.created_at asc;
$$;

grant execute on function public.rpc_recruiting_slot_assignments_read_v1(
  uuid, text
) to authenticated;
