-- recruiting(m3): candidate impacts validation surface (rpc)
-- Advisory-only: emits diagnostics about the M3 impact table integrity vs recruitable deficits.
-- Does not mutate Program Health. Does not introduce non-recruitable absences into Recruiting.

begin;

create or replace function public.rpc_recruiting_candidate_impacts_validate_v1(
  p_program_id uuid,
  p_sport text,
  p_horizon text,
  p_inputs_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_member boolean;
  v_impacts_count bigint;
  v_missing_canonical_event_id_count bigint;
  v_orphan_capability_nodes_count bigint;
  v_orphan_capability_nodes uuid[];
  v_distinct_recruits bigint;
begin
  -- Guard: must be a member of the program
  select exists (
    select 1
    from public.program_members pm
    where pm.program_id = p_program_id
      and pm.user_id = auth.uid()
  )
  into v_is_member;

  if not v_is_member then
    raise exception 'not authorized';
  end if;

  select count(*)::bigint
  into v_impacts_count
  from public.recruiting_candidate_impacts i
  where i.program_id = p_program_id
    and i.sport = p_sport
    and i.horizon = p_horizon
    and i.inputs_hash = p_inputs_hash;

  select count(*)::bigint
  into v_distinct_recruits
  from (
    select distinct i.recruit_id
    from public.recruiting_candidate_impacts i
    where i.program_id = p_program_id
      and i.sport = p_sport
      and i.horizon = p_horizon
      and i.inputs_hash = p_inputs_hash
  ) t;

  select count(*)::bigint
  into v_missing_canonical_event_id_count
  from public.recruiting_candidate_impacts i
  where i.program_id = p_program_id
    and i.sport = p_sport
    and i.horizon = p_horizon
    and i.inputs_hash = p_inputs_hash
    and i.canonical_event_id is null;

  -- Orphans: capability nodes present in impacts but not present in the recruitable deficit surface
  -- for the same program/sport/horizon (Recruiting contract boundary).
  with impacts as (
    select distinct i.capability_node_id
    from public.recruiting_candidate_impacts i
    where i.program_id = p_program_id
      and i.sport = p_sport
      and i.horizon = p_horizon
      and i.inputs_hash = p_inputs_hash
  ),
  deficits as (
    select distinct d.capability_node_id
    from public.recruiting_recruitable_deficits d
    where d.program_id = p_program_id
      and d.sport = p_sport
      and d.horizon = p_horizon
  ),
  orphaned as (
    select i.capability_node_id
    from impacts i
    left join deficits d
      on d.capability_node_id = i.capability_node_id
    where d.capability_node_id is null
  )
  select
    count(*)::bigint,
    coalesce((array_agg(capability_node_id order by capability_node_id))[1:10], array[]::uuid[])
  into
    v_orphan_capability_nodes_count,
    v_orphan_capability_nodes
  from orphaned;

  return jsonb_build_object(
    'program_id', p_program_id,
    'sport', p_sport,
    'horizon', p_horizon,
    'inputs_hash', p_inputs_hash,
    'impacts_count', v_impacts_count,
    'distinct_recruits', v_distinct_recruits,
    'missing_canonical_event_id_count', v_missing_canonical_event_id_count,
    'orphan_capability_nodes_count', v_orphan_capability_nodes_count,
    'orphan_capability_nodes_sample', v_orphan_capability_nodes,
    'ok', (v_missing_canonical_event_id_count = 0 and v_orphan_capability_nodes_count = 0)
  );
end;
$$;

revoke all on function public.rpc_recruiting_candidate_impacts_validate_v1(uuid, text, text, text) from public;
grant execute on function public.rpc_recruiting_candidate_impacts_validate_v1(uuid, text, text, text) to authenticated;

commit;
