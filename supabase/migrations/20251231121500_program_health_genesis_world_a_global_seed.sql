-- Program Health — Genesis World A (Global Runtime Seed)
-- Date: 2025-12-31
-- Narrative: Stable program with emerging CAPACITY strain (H2→H1), medium visibility, spread within sector, backbone bleed enabled.
--
-- Idempotent: safe to re-run; inserts only if the absence_key(s) do not already exist per program/horizon/sport.

begin;

-- ---------------------------------------------------------------------------
-- 0) Helper CTEs
-- ---------------------------------------------------------------------------
with
programs_src as (
  select
    p.id as program_id,
    case
      when lower(p.sport) in ('xc','tf') then lower(p.sport)
      else 'xc'
    end as sport
  from public.programs p
),
capacity_nodes as (
  -- Prefer nodes that look CAPACITY-like (best-effort heuristic).
  -- If none match for a program, we will fall back to "any 3 nodes" later.
  select
    cn.program_id,
    cn.id as capability_node_id,
    row_number() over (
      partition by cn.program_id
      order by
        (case
          when lower(cn.node_code) like 'cap%' then 0
          when lower(cn.name) like '%capacity%' then 1
          when lower(cn.name) like '%headroom%' then 2
          when lower(cn.name) like '%bandwidth%' then 3
          when lower(cn.name) like '%load%' then 4
          else 50
        end),
        cn.node_code,
        cn.created_at
    ) as rn
  from public.capability_nodes cn
),
fallback_nodes as (
  select
    cn.program_id,
    cn.id as capability_node_id,
    row_number() over (partition by cn.program_id order by cn.node_code, cn.created_at) as rn
  from public.capability_nodes cn
),
chosen_nodes as (
  -- Take up to 3 “capacity-like” nodes; if none exist for a program, take the first 3 nodes.
  select program_id, capability_node_id, rn
  from capacity_nodes
  where rn <= 3

  union all

  select fn.program_id, fn.capability_node_id, fn.rn
  from fallback_nodes fn
  where fn.rn <= 3
    and not exists (
      select 1
      from capacity_nodes cn
      where cn.program_id = fn.program_id
        and cn.rn = 1
    )
),
seed_plan as (
  -- 3 absences: two in H2 and one in H1, spread across chosen nodes (rn 1..3).
  select
    ps.program_id,
    ps.sport,
    cn.capability_node_id,
    case cn.rn
      when 1 then 'H2'
      when 2 then 'H2'
      else 'H1'
    end as horizon,
    cn.rn as slot
  from programs_src ps
  join chosen_nodes cn on cn.program_id = ps.program_id
  where cn.rn in (1,2,3)
),
event_rows as (
  -- Create canonical events (one per seeded absence) if the corresponding absence_key doesn't already exist.
  insert into public.canonical_events (
    program_id,
    event_domain,
    event_type,
    scope_type,
    scope_id,
    actor_user_id,
    source_system,
    causality,
    payload
  )
  select
    sp.program_id,
    'program_health' as event_domain,
    'genesis_absence_seed' as event_type,
    'program' as scope_type,
    sp.program_id as scope_id,
    null::uuid as actor_user_id,
    'migration' as source_system,
    jsonb_build_object(
      'genesis_world', 'A',
      'primary_fault_sector', 'capacity',
      'distribution', 'spread',
      'temporal_gradient', 'H2_to_H1',
      'recovery', 'none',
      'stress_propagation', 'axis_backbone',
      'backbone_pair', 'resilience'
    ) as causality,
    jsonb_build_object(
      'sector', 'capacity',
      'capability_node_id', sp.capability_node_id,
      'horizon', sp.horizon,
      'slot', sp.slot,
      'visibility', 'medium',
      'note', 'Genesis World A: early CAPACITY strain, no recovery yet.'
    ) as payload
  from seed_plan sp
  where not exists (
    select 1
    from public.program_health_absences pha
    where pha.program_id = sp.program_id
      and pha.sport = sp.sport
      and pha.horizon = sp.horizon
      and pha.absence_key = ('genesis_world_a:capacity:' || sp.capability_node_id::text || ':' || sp.horizon)
  )
  returning
    id as canonical_event_id,
    program_id,
    (payload->>'capability_node_id')::uuid as capability_node_id,
    payload->>'horizon' as horizon
),
ledger_rows as (
  -- Create a ledger entry per canonical event (no FK constraint on pha.ledger_id, but we keep it lawful).
  insert into public.program_health_ledger (
    canonical_event_id,
    program_id,
    engine_version,
    sport,
    horizon,
    inputs_hash,
    result_payload
  )
  select
    er.canonical_event_id,
    er.program_id,
    'a1_v1' as engine_version,
    (select case when lower(p.sport) in ('xc','tf') then lower(p.sport) else 'xc' end from public.programs p where p.id = er.program_id) as sport,
    er.horizon,
    'genesis_world_a_seed' as inputs_hash,
    jsonb_build_object(
      'sector', 'capacity',
      'backbone_bleed_enabled', true,
      'paired_sector', 'resilience',
      'recovery', 'none',
      'visibility', 'medium'
    ) as result_payload
  from event_rows er
  returning id as ledger_id, canonical_event_id, program_id
),
absence_rows as (
  -- Insert the absences.
  insert into public.program_health_absences (
    program_id,
    scope_id,
    sport,
    horizon,
    absence_key,
    absence_type,
    severity,
    details,
    canonical_event_id,
    ledger_id
  )
  select
    er.program_id,
    er.program_id as scope_id,
    (select case when lower(p.sport) in ('xc','tf') then lower(p.sport) else 'xc' end from public.programs p where p.id = er.program_id) as sport,
    er.horizon,
    ('genesis_world_a:capacity:' || er.capability_node_id::text || ':' || er.horizon) as absence_key,
    'capacity_strain' as absence_type,
    case
      when er.horizon = 'H1' then 'medium'
      else 'low'
    end as severity,
    jsonb_build_object(
      'sector', 'capacity',
      'capability_node_id', er.capability_node_id,
      'visibility', 'medium',
      'distribution', 'spread',
      'temporal_gradient', 'H2_to_H1',
      'recovery', 'none',
      'physics', 'load_bearing_collapse',
      'stress_propagation', 'axis_backbone',
      'backbone_pair', 'resilience',
      'coach_note', 'Headroom is thinning. You still have time.'
    ) as details,
    er.canonical_event_id,
    lr.ledger_id
  from event_rows er
  join ledger_rows lr on lr.canonical_event_id = er.canonical_event_id
  returning id, program_id, canonical_event_id
),
bleed_events as (
  -- Create one "backbone bleed" canonical event per program (optional truth metadata; idempotent).
  insert into public.canonical_events (
    program_id,
    event_domain,
    event_type,
    scope_type,
    scope_id,
    actor_user_id,
    source_system,
    causality,
    payload
  )
  select distinct
    ar.program_id,
    'program_health' as event_domain,
    'genesis_backbone_bleed_enabled' as event_type,
    'program' as scope_type,
    ar.program_id as scope_id,
    null::uuid as actor_user_id,
    'migration' as source_system,
    jsonb_build_object(
      'genesis_world', 'A',
      'stress_propagation', 'axis_backbone',
      'backbone_pair', 'capacity_to_resilience'
    ) as causality,
    jsonb_build_object(
      'from_sector', 'capacity',
      'to_sector', 'resilience',
      'enabled', true
    ) as payload
  from absence_rows ar
  where not exists (
    select 1
    from public.canonical_events ce
    where ce.program_id = ar.program_id
      and ce.event_domain = 'program_health'
      and ce.event_type = 'genesis_backbone_bleed_enabled'
      and (ce.payload->>'from_sector') = 'capacity'
      and (ce.payload->>'to_sector') = 'resilience'
  )
  returning id as canonical_event_id, program_id
)
-- Link each seeded absence event to the program-level bleed event for lineage clarity.
insert into public.canonical_event_links (
  from_canonical_event_id,
  to_canonical_event_id,
  link_type
)
select
  ar.canonical_event_id as from_canonical_event_id,
  be.canonical_event_id as to_canonical_event_id,
  'genesis_backbone_context' as link_type
from absence_rows ar
join bleed_events be on be.program_id = ar.program_id
where not exists (
  select 1
  from public.canonical_event_links cel
  where cel.from_canonical_event_id = ar.canonical_event_id
    and cel.to_canonical_event_id = be.canonical_event_id
    and cel.link_type = 'genesis_backbone_context'
);

commit;
