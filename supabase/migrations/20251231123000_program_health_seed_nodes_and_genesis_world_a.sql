begin;

-- ---------------------------------------------------------------------------
-- 1) Seed minimal canonical capability nodes per program (6-sector anchor set)
-- ---------------------------------------------------------------------------
with programs_src as (
  select p.id as program_id
  from public.programs p
),
seed_nodes as (
  select * from (values
    ('structure',  'STRUCTURE',  'Structural foundation and governance stability'),
    ('readiness',  'READINESS',  'Immediate posture and near-term activation state'),
    ('capacity',   'CAPACITY',   'Headroom and resource margin under load'),
    ('recovery',   'RECOVERY',   'Return-to-baseline behavior and stabilization'),
    ('execution',  'EXECUTION',  'Throughput, delivery coherence, and reliability'),
    ('resilience', 'RESILIENCE', 'Durability under stress and sustained function')
  ) as t(node_code, name, description)
)
insert into public.capability_nodes (program_id, node_code, name, scope_type, description, is_active)
select
  ps.program_id,
  sn.node_code,
  sn.name,
  'program' as scope_type,
  sn.description,
  true as is_active
from programs_src ps
cross join seed_nodes sn
where not exists (
  select 1
  from public.capability_nodes cn
  where cn.program_id = ps.program_id
    and lower(cn.node_code) = lower(sn.node_code)
);

-- ---------------------------------------------------------------------------
-- 2) Seed Genesis World A absences (CAPACITY primary, H2→H1 gradient, spread, no recovery)
--    Also mint canonical events + program_health_ledger rows for lawful linkage.
-- ---------------------------------------------------------------------------
with
programs_src as (
  select
    p.id as program_id,
    case when lower(p.sport) in ('xc','tf') then lower(p.sport) else 'xc' end as sport
  from public.programs p
),
capacity_nodes as (
  select
    cn.program_id,
    cn.id as capability_node_id,
    row_number() over (partition by cn.program_id order by cn.created_at, cn.node_code) as rn
  from public.capability_nodes cn
  where lower(cn.node_code) = 'capacity'
),
resilience_nodes as (
  select
    cn.program_id,
    cn.id as capability_node_id
  from public.capability_nodes cn
  where lower(cn.node_code) = 'resilience'
),
seed_plan as (
  -- 3 absences: two H2 and one H1 (H2→H1 gradient), “spread” is encoded in details.
  -- Since CAPACITY is a single canonical node in this minimal set, “spread” is represented by distinct absence_keys/slots.
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
  join capacity_nodes cn on cn.program_id = ps.program_id
  where cn.rn in (1,2,3)
),
event_rows as (
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
      and pha.absence_key = ('genesis_world_a:capacity:' || sp.program_id::text || ':slot:' || sp.slot::text || ':' || sp.horizon)
  )
  returning id as canonical_event_id, program_id, payload->>'horizon' as horizon, (payload->>'slot')::int as slot
),
ledger_rows as (
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
      'visibility', 'medium',
      'distribution', 'spread'
    ) as result_payload
  from event_rows er
  returning id as ledger_id, canonical_event_id, program_id
),
absence_rows as (
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
    ('genesis_world_a:capacity:' || er.program_id::text || ':slot:' || er.slot::text || ':' || er.horizon) as absence_key,
    'capacity_strain' as absence_type,
    case when er.horizon = 'H1' then 'medium' else 'low' end as severity,
    jsonb_build_object(
      'sector', 'capacity',
      'capability_node_code', 'capacity',
      'visibility', 'medium',
      'distribution', 'spread',
      'temporal_gradient', 'H2_to_H1',
      'recovery', 'none',
      'stress_propagation', 'axis_backbone',
      'backbone_pair', 'resilience',
      'coach_note', 'Headroom is thinning. You still have time.'
    ) as details,
    er.canonical_event_id,
    lr.ledger_id
  from event_rows er
  join ledger_rows lr on lr.canonical_event_id = er.canonical_event_id
  returning program_id, canonical_event_id
),
bleed_events as (
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
insert into public.canonical_event_links (
  from_canonical_event_id,
  to_canonical_event_id,
  link_type
)
select
  ar.canonical_event_id,
  be.canonical_event_id,
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
