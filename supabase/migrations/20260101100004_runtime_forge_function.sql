begin;

create or replace function public.forge_runtime_from_charter(p_charter_id uuid)
returns uuid
language plpgsql
as $$
declare
  v_charter public.runtime_charters%rowtype;
  v_genesis_id uuid;
  v_new_runtime_id uuid := gen_random_uuid();
  v_now timestamptz := now();
begin
  select * into v_charter
  from public.runtime_charters
  where id = p_charter_id
    and status = 'accepted';

  if not found then
    raise exception 'Charter not found or not accepted.';
  end if;

  select id into v_genesis_id
  from public.runtimes
  where runtime_type = 'genesis'
  limit 1;

  if v_genesis_id is null then
    raise exception 'Genesis runtime not found.';
  end if;

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
    v_now,
    v_now,
    v_charter.temporal_scope,
    jsonb_build_object('charter_id', v_charter.id)
  );

  update public.runtime_charters
    set status = 'forged'
  where id = v_charter.id;

  return v_new_runtime_id;
end;
$$;

commit;
