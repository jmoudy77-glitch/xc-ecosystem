begin;

-- 1) Enforce sealed-write law (with forging allowlist)
create or replace function public.trg_runtime_events_sealed_write_guard()
returns trigger
language plpgsql
as $$
declare
  v_status public.runtime_status;
begin
  select status into v_status
  from public.runtimes
  where id = new.runtime_id;

  if v_status is null then
    raise exception 'runtime_id not found in runtimes registry.';
  end if;

  -- Allow specific structural events while forging
  if v_status = 'forging' then
    if new.event_type in (
      'runtime.forge.anchor',
      'runtime.partition.install',
      'runtime.authority.install',
      'runtime.seal'
    ) then
      return new;
    end if;

    raise exception 'Unsealed runtime may only accept structural forging events.';
  end if;

  -- Sealed is the only state that admits canonical events
  if v_status <> 'sealed' then
    raise exception 'Runtime is not sealed; canonical events rejected.';
  end if;

  return new;
end $$;

drop trigger if exists runtime_events_sealed_write_guard on public.runtime_events;
create trigger runtime_events_sealed_write_guard
before insert on public.runtime_events
for each row execute function public.trg_runtime_events_sealed_write_guard();

-- 2) Helpers: insert a runtime event with hash autocompute + monotonic occurred_at
create or replace function public.runtime_events_next_occurred_at(p_runtime_id uuid)
returns timestamptz
language plpgsql
as $$
declare
  v_last timestamptz;
begin
  select occurred_at into v_last
  from public.runtime_events
  where runtime_id = p_runtime_id
  order by occurred_at desc, recorded_at desc
  limit 1;

  if v_last is null then
    return now();
  end if;

  return greatest(now(), v_last + interval '1 millisecond');
end $$;

create or replace function public.runtime_events_last_hash(p_runtime_id uuid)
returns text
language plpgsql
as $$
declare
  v_last text;
begin
  select hash into v_last
  from public.runtime_events
  where runtime_id = p_runtime_id
  order by occurred_at desc, recorded_at desc
  limit 1;

  return v_last;
end $$;

create or replace function public.runtime_emit_event(
  p_runtime_id uuid,
  p_parent_runtime_id uuid,
  p_cause_event_id uuid,
  p_actor_type text,
  p_actor_id uuid,
  p_scope_type public.runtime_scope_type,
  p_scope_id uuid,
  p_event_type text,
  p_payload jsonb
) returns uuid
language plpgsql
as $$
declare
  v_event_id uuid;
  v_prev_hash text;
  v_occurred_at timestamptz;
begin
  v_prev_hash := public.runtime_events_last_hash(p_runtime_id);
  v_occurred_at := public.runtime_events_next_occurred_at(p_runtime_id);

  insert into public.runtime_events (
    runtime_id,
    parent_runtime_id,
    cause_event_id,
    occurred_at,
    recorded_at,
    actor_type,
    actor_id,
    scope_type,
    scope_id,
    event_type,
    payload,
    prev_hash,
    hash
  ) values (
    p_runtime_id,
    p_parent_runtime_id,
    p_cause_event_id,
    v_occurred_at,
    now(),
    p_actor_type,
    p_actor_id,
    p_scope_type,
    p_scope_id,
    p_event_type,
    coalesce(p_payload,'{}'::jsonb),
    v_prev_hash,
    null
  )
  returning event_id into v_event_id;

  return v_event_id;
end $$;

-- 3) Accept charter (Genesis canonical event + status transition)
create or replace function public.accept_runtime_charter(p_charter_id uuid, p_actor_type text, p_actor_id uuid)
returns uuid
language plpgsql
as $$
declare
  v_genesis_id uuid;
  v_charter public.runtime_charters%rowtype;
  v_submit_event_id uuid;
  v_accept_event_id uuid;
begin
  select id into v_genesis_id
  from public.runtimes
  where runtime_type = 'genesis'
  limit 1;

  if v_genesis_id is null then
    raise exception 'Genesis runtime not found.';
  end if;

  select * into v_charter
  from public.runtime_charters
  where id = p_charter_id;

  if not found then
    raise exception 'Charter not found.';
  end if;

  if v_charter.status <> 'submitted' then
    raise exception 'Charter must be submitted to accept (current=%).', v_charter.status;
  end if;

  -- Find the most recent submit event for this charter if present (optional)
  select event_id into v_submit_event_id
  from public.runtime_events
  where runtime_id = v_genesis_id
    and event_type = 'runtime.charter.submit'
    and (payload->>'charter_id')::text = v_charter.id::text
  order by occurred_at desc, recorded_at desc
  limit 1;

  v_accept_event_id := public.runtime_emit_event(
    v_genesis_id,
    null,
    v_submit_event_id,
    p_actor_type,
    p_actor_id,
    'runtime',
    v_genesis_id,
    'runtime.charter.accept',
    jsonb_build_object(
      'charter_id', v_charter.id,
      'runtime_type', v_charter.runtime_type,
      'temporal_scope', v_charter.temporal_scope,
      'identity_seeds', v_charter.identity_seeds,
      'requested_authorities', v_charter.requested_authorities
    )
  );

  update public.runtime_charters
    set status = 'accepted',
        decision_event_id = v_accept_event_id
  where id = v_charter.id;

  return v_accept_event_id;
end $$;

-- 4) Forge + install partitions + install authorities + seal (fully deterministic pipeline)
create or replace function public.forge_and_seal_runtime_from_charter(p_charter_id uuid, p_actor_type text, p_actor_id uuid)
returns uuid
language plpgsql
as $$
declare
  v_genesis_id uuid;
  v_charter public.runtime_charters%rowtype;
  v_new_runtime_id uuid := gen_random_uuid();
  v_forge_event_id uuid;
  v_anchor_event_id uuid;
  v_partition_event_id uuid;
  v_authority_event_id uuid;
  v_seal_event_id uuid;
  v_partition_id uuid;
begin
  select id into v_genesis_id
  from public.runtimes
  where runtime_type = 'genesis'
  limit 1;

  if v_genesis_id is null then
    raise exception 'Genesis runtime not found.';
  end if;

  select * into v_charter
  from public.runtime_charters
  where id = p_charter_id
    and status = 'accepted';

  if not found then
    raise exception 'Charter not found or not accepted.';
  end if;

  -- Forge event in Genesis
  v_forge_event_id := public.runtime_emit_event(
    v_genesis_id,
    null,
    v_charter.decision_event_id,
    p_actor_type,
    p_actor_id,
    'runtime',
    v_genesis_id,
    'runtime.forge',
    jsonb_build_object(
      'charter_id', v_charter.id,
      'new_runtime_id', v_new_runtime_id,
      'runtime_type', v_charter.runtime_type,
      'temporal_scope', v_charter.temporal_scope,
      'identity_seeds', v_charter.identity_seeds
    )
  );

  -- Create runtime registry row (forging)
  insert into public.runtimes (
    id,
    runtime_type,
    parent_runtime_id,
    status,
    created_at,
    temporal_origin,
    temporal_scope,
    metadata
  ) values (
    v_new_runtime_id,
    v_charter.runtime_type,
    v_genesis_id,
    'forging',
    now(),
    now(),
    v_charter.temporal_scope,
    jsonb_build_object('charter_id', v_charter.id::text, 'genesis_forge_event_id', v_forge_event_id::text)
  );

  -- Anchor event in child runtime
  v_anchor_event_id := public.runtime_emit_event(
    v_new_runtime_id,
    v_genesis_id,
    v_forge_event_id,
    p_actor_type,
    p_actor_id,
    'runtime',
    v_new_runtime_id,
    'runtime.forge.anchor',
    jsonb_build_object(
      'parent_runtime_id', v_genesis_id,
      'forge_event_id', v_forge_event_id,
      'charter_id', v_charter.id
    )
  );

  -- Install partitions (team/athlete/event_group) as declared by identity_seeds
  if coalesce((v_charter.identity_seeds->>'team')::boolean, false) then
    v_partition_event_id := public.runtime_emit_event(
      v_new_runtime_id,
      v_genesis_id,
      v_anchor_event_id,
      p_actor_type,
      p_actor_id,
      'runtime',
      v_new_runtime_id,
      'runtime.partition.install',
      jsonb_build_object('partition_type','team','partition_key','*')
    );

    insert into public.runtime_partitions (runtime_id, partition_type, partition_key, installed_by_event_id)
    values (v_new_runtime_id, 'team', '*', v_partition_event_id)
    returning id into v_partition_id;
  end if;

  if coalesce((v_charter.identity_seeds->>'athlete')::boolean, false) then
    v_partition_event_id := public.runtime_emit_event(
      v_new_runtime_id,
      v_genesis_id,
      v_anchor_event_id,
      p_actor_type,
      p_actor_id,
      'runtime',
      v_new_runtime_id,
      'runtime.partition.install',
      jsonb_build_object('partition_type','athlete','partition_key','*')
    );

    insert into public.runtime_partitions (runtime_id, partition_type, partition_key, installed_by_event_id)
    values (v_new_runtime_id, 'athlete', '*', v_partition_event_id)
    returning id into v_partition_id;
  end if;

  if coalesce((v_charter.identity_seeds->>'event_group')::boolean, false) then
    v_partition_event_id := public.runtime_emit_event(
      v_new_runtime_id,
      v_genesis_id,
      v_anchor_event_id,
      p_actor_type,
      p_actor_id,
      'runtime',
      v_new_runtime_id,
      'runtime.partition.install',
      jsonb_build_object('partition_type','event_group','partition_key','*')
    );

    insert into public.runtime_partitions (runtime_id, partition_type, partition_key, installed_by_event_id)
    values (v_new_runtime_id, 'event_group', '*', v_partition_event_id)
    returning id into v_partition_id;
  end if;

  -- Install minimal authority surfaces
  v_authority_event_id := public.runtime_emit_event(
    v_new_runtime_id,
    v_genesis_id,
    v_anchor_event_id,
    p_actor_type,
    p_actor_id,
    'runtime',
    v_new_runtime_id,
    'runtime.authority.install',
    jsonb_build_object('authority_class','system_integrity','principal_id',p_actor_id::text)
  );

  insert into public.runtime_authority_surfaces (
    runtime_id, authority_class, principal_id, scope, permissions, status, installed_by_event_id
  ) values (
    v_new_runtime_id,
    'system_integrity',
    p_actor_id,
    '{}'::jsonb,
    jsonb_build_object('allow', array['runtime.integrity.alert']),
    'active',
    v_authority_event_id
  );

  v_authority_event_id := public.runtime_emit_event(
    v_new_runtime_id,
    v_genesis_id,
    v_anchor_event_id,
    p_actor_type,
    p_actor_id,
    'runtime',
    v_new_runtime_id,
    'runtime.authority.install',
    jsonb_build_object('authority_class','program_authority','principal_id',p_actor_id::text)
  );

  insert into public.runtime_authority_surfaces (
    runtime_id, authority_class, principal_id, scope, permissions, status, installed_by_event_id
  ) values (
    v_new_runtime_id,
    'program_authority',
    p_actor_id,
    '{}'::jsonb,
    jsonb_build_object('allow', array['*']),
    'active',
    v_authority_event_id
  );

  -- Seal event in child runtime
  v_seal_event_id := public.runtime_emit_event(
    v_new_runtime_id,
    v_genesis_id,
    v_anchor_event_id,
    p_actor_type,
    p_actor_id,
    'runtime',
    v_new_runtime_id,
    'runtime.seal',
    jsonb_build_object(
      'sealing_version','v1',
      'charter_id', v_charter.id
    )
  );

  update public.runtimes
    set status = 'sealed',
        sealed_at = now()
  where id = v_new_runtime_id;

  update public.runtime_charters
    set status = 'forged'
  where id = v_charter.id;

  return v_new_runtime_id;
end $$;

commit;
