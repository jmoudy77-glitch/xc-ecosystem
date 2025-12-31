begin;

with
programs as (
  select distinct program_id
  from public.capability_nodes
),
pick_node as (
  select
    cn.program_id,
    cn.id as capability_node_id,
    row_number() over (
      partition by cn.program_id
      order by
        case
          when lower(coalesce(cn.node_code, cn.name, '')) like '%capacity%' then 0
          when lower(coalesce(cn.node_code, cn.name, '')) like '%readiness%' then 1
          when lower(coalesce(cn.node_code, cn.name, '')) like '%execution%' then 2
          when lower(coalesce(cn.node_code, cn.name, '')) like '%recovery%' then 3
          when lower(coalesce(cn.node_code, cn.name, '')) like '%structure%' then 4
          when lower(coalesce(cn.node_code, cn.name, '')) like '%resilience%' then 5
          else 9
        end,
        cn.created_at asc
    ) as rn
  from public.capability_nodes cn
),
anchor as (
  select program_id, capability_node_id
  from pick_node
  where rn = 1
),
seed_plan as (
  select
    a.program_id,
    a.capability_node_id,
    h.horizon,
    h.slot,
    ('genesis_absence:' || a.program_id::text || ':' || a.capability_node_id::text || ':' || h.horizon)::text as absence_key
  from anchor a
  cross join (values ('H1'::text, 1), ('H2'::text, 2)) as h(horizon, slot)
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
      'note', 'R4_0 minted lawful genesis absence.'
    ) as payload
  from seed_plan sp
  where not exists (
    select 1
    from public.program_health_absences pha
    where pha.program_id = sp.program_id
      and pha.absence_key = sp.absence_key
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
    'r4_0_genesis_seed' as inputs_hash,
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
)
insert into public.program_health_absences (
  program_id,
  scope_id,
  sport,
  horizon,
  absence_key,
  capability_node_id,
  absence_type,
  severity,
  cause_event_id,
  notes,
  canonical_event_id,
  ledger_id
)
select
  er.program_id,
  er.program_id as scope_id,
  (select case when lower(p.sport) in ('xc','tf') then lower(p.sport) else 'xc' end from public.programs p where p.id = er.program_id) as sport,
  er.horizon,
  sp.absence_key,
  sp.capability_node_id,
  'genesis'::text as absence_type,
  case when er.horizon = 'H1' then 2 else 3 end as severity,
  null::uuid as cause_event_id,
  ('R4_0 minted lawful genesis absence @ ' || er.horizon)::text as notes,
  er.canonical_event_id,
  lr.ledger_id
from event_rows er
join seed_plan sp on sp.program_id = er.program_id and sp.horizon = er.horizon
join ledger_rows lr on lr.canonical_event_id = er.canonical_event_id
where not exists (
  select 1
  from public.program_health_absences pha
  where pha.program_id = er.program_id
    and pha.absence_key = sp.absence_key
);

commit;
