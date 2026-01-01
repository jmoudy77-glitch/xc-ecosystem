begin;

-- crypto for digest()
create extension if not exists pgcrypto;

-- ----------------------------
-- Hash computation (runtime_events)
-- ----------------------------
create or replace function public.runtime_events_compute_hash(
  prev_hash text,
  runtime_id uuid,
  parent_runtime_id uuid,
  cause_event_id uuid,
  occurred_at timestamptz,
  actor_type text,
  actor_id uuid,
  scope_type public.runtime_scope_type,
  scope_id uuid,
  event_type text,
  payload jsonb
) returns text
language sql
immutable
as $$
  select encode(
    extensions.digest(
      convert_to(
        coalesce(prev_hash,'') || '|' ||
        coalesce(runtime_id::text,'') || '|' ||
        coalesce(parent_runtime_id::text,'') || '|' ||
        coalesce(cause_event_id::text,'') || '|' ||
        coalesce(occurred_at::text,'') || '|' ||
        coalesce(actor_type,'') || '|' ||
        coalesce(actor_id::text,'') || '|' ||
        coalesce(scope_type::text,'') || '|' ||
        coalesce(scope_id::text,'') || '|' ||
        coalesce(event_type,'') || '|' ||
        coalesce(payload::text,'{}'),
        'utf8'
      ),
      'sha256'::text
    ),
    'hex'
  );
$$;

create or replace function public.trg_runtime_events_hash_autofill()
returns trigger language plpgsql as $$
begin
  if new.hash is null or length(new.hash) = 0 then
    new.hash := public.runtime_events_compute_hash(
      new.prev_hash,
      new.runtime_id,
      new.parent_runtime_id,
      new.cause_event_id,
      new.occurred_at,
      new.actor_type,
      new.actor_id,
      new.scope_type,
      new.scope_id,
      new.event_type,
      new.payload
    );
  end if;

  return new;
end $$;

drop trigger if exists runtime_events_hash_autofill on public.runtime_events;
create trigger runtime_events_hash_autofill
before insert on public.runtime_events
for each row execute function public.trg_runtime_events_hash_autofill();

-- ----------------------------
-- Seed Genesis (idempotent)
-- ----------------------------
do $$
declare
  v_genesis_id uuid;
  v_event_id uuid;
  v_now timestamptz := now();
  v_system_principal uuid := '00000000-0000-0000-0000-000000000001'::uuid;
begin
  select id into v_genesis_id
  from public.runtimes
  where runtime_type = 'genesis'
  limit 1;

  if v_genesis_id is null then
    insert into public.runtimes (
      runtime_type,
      parent_runtime_id,
      status,
      created_at,
      sealed_at,
      temporal_origin,
      temporal_scope,
      metadata
    ) values (
      'genesis',
      null,
      'sealed',
      v_now,
      v_now,
      v_now,
      jsonb_build_object('type','genesis'),
      jsonb_build_object('seed','manual_migration','system_principal_id',v_system_principal::text)
    )
    returning id into v_genesis_id;
  end if;

  -- ensure genesis.create is first ledger event for genesis runtime
  if not exists (
    select 1
    from public.runtime_events
    where runtime_id = v_genesis_id
      and event_type = 'genesis.create'
    limit 1
  ) then
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
      v_genesis_id,
      null,
      null,
      v_now,
      v_now,
      'system',
      v_system_principal,
      'runtime',
      v_genesis_id,
      'genesis.create',
      jsonb_build_object(
        'runtime_type','genesis',
        'temporal_origin', v_now,
        'system_principal_id', v_system_principal::text
      ),
      null,
      null
    )
    returning event_id into v_event_id;
  else
    select event_id into v_event_id
    from public.runtime_events
    where runtime_id = v_genesis_id
      and event_type = 'genesis.create'
    order by occurred_at asc, recorded_at asc
    limit 1;
  end if;

  -- seed minimum authority surfaces (idempotent)
  if not exists (
    select 1
    from public.runtime_authority_surfaces
    where runtime_id = v_genesis_id
      and authority_class = 'system_integrity'
      and principal_id = v_system_principal
    limit 1
  ) then
    insert into public.runtime_authority_surfaces (
      runtime_id,
      authority_class,
      principal_id,
      scope,
      permissions,
      status,
      installed_by_event_id
    ) values (
      v_genesis_id,
      'system_integrity',
      v_system_principal,
      '{}'::jsonb,
      jsonb_build_object('allow', array['runtime.integrity.alert']),
      'active',
      v_event_id
    );
  end if;

  if not exists (
    select 1
    from public.runtime_authority_surfaces
    where runtime_id = v_genesis_id
      and authority_class = 'runtime_mint'
      and principal_id = v_system_principal
    limit 1
  ) then
    insert into public.runtime_authority_surfaces (
      runtime_id,
      authority_class,
      principal_id,
      scope,
      permissions,
      status,
      installed_by_event_id
    ) values (
      v_genesis_id,
      'runtime_mint',
      v_system_principal,
      '{}'::jsonb,
      jsonb_build_object('allow', array[
        'runtime.charter.submit',
        'runtime.charter.accept',
        'runtime.charter.reject',
        'runtime.forge'
      ]),
      'active',
      v_event_id
    );
  end if;

end $$;

commit;
