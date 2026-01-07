create or replace function public.rpc_recruiting_slot_presence_read_v1(
  p_program_id uuid,
  p_sport text
)
returns table (
  event_group_key text,
  slot_id text,
  has_primary boolean
)
language sql
security definer
set search_path = public
as $$
  select
    rsa.event_group_key,
    rsa.slot_id,
    bool_or(rsa.is_primary) as has_primary
  from public.recruiting_slot_assignments rsa
  where rsa.program_id = p_program_id
    and rsa.sport = p_sport
    and exists (
      select 1
      from public.program_members pm
      where pm.program_id = rsa.program_id
        and pm.user_id = auth.uid()
    )
  group by
    rsa.event_group_key,
    rsa.slot_id;
$$;

grant execute on function public.rpc_recruiting_slot_presence_read_v1(
  uuid, text
) to authenticated;
