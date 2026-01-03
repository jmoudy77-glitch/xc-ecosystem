-- recruiting(m3): on-demand compute trigger (ensure impacts exist for inputs_hash)
-- Constitution: advisory-only derived analytics; idempotent; service-role compute; no Program Health mutation.

begin;

-- helper: returns latest recruitable deficit snapshot id (assumes M1 canon has a snapshot id available)
-- NOTE: if this function fails due to missing columns, adjust to the canonical M1 source of snapshot id.
create or replace function public.rpc_recruiting_recruitable_deficits_latest_snapshot_id(
  p_program_id uuid,
  p_sport text,
  p_horizon text
)
returns uuid
language sql
security definer
as $$
  select d.canonical_event_id
  from public.recruiting_recruitable_deficits d
  where d.program_id = p_program_id
    and d.sport = p_sport
    and d.horizon = p_horizon
  order by d.created_at desc
  limit 1;
$$;

comment on function public.rpc_recruiting_recruitable_deficits_latest_snapshot_id is
'M3 helper: returns latest canonical_event_id backing recruitable deficits for inputs_hash composition';

grant execute on function public.rpc_recruiting_recruitable_deficits_latest_snapshot_id(uuid, text, text) to authenticated;

-- helper: compute deterministic inputs_hash v1 (program_id + sport + horizon + snapshot_id)
create or replace function public.rpc_recruiting_candidate_impacts_inputs_hash_v1(
  p_program_id uuid,
  p_sport text,
  p_horizon text
)
returns text
language plpgsql
security definer
as $$
declare
  v_snapshot_id uuid;
begin
  v_snapshot_id := public.rpc_recruiting_recruitable_deficits_latest_snapshot_id(p_program_id, p_sport, p_horizon);

  -- when no snapshot exists, return a stable sentinel to prevent accidental compute writes
  if v_snapshot_id is null then
    return null;
  end if;

  return encode(
    digest(
      concat_ws('|',
        'm3_candidate_impacts_v1',
        p_program_id::text,
        p_sport,
        p_horizon,
        v_snapshot_id::text
      ),
      'sha256'
    ),
    'hex'
  );
end;
$$;

comment on function public.rpc_recruiting_candidate_impacts_inputs_hash_v1 is
'M3 helper: sha256 inputs_hash v1 from program_id, sport, horizon, recruitable deficits snapshot id';

grant execute on function public.rpc_recruiting_candidate_impacts_inputs_hash_v1(uuid, text, text) to authenticated;

-- ensure function: idempotent compute trigger
create or replace function public.rpc_recruiting_candidate_impacts_ensure_v1(
  p_program_id uuid,
  p_sport text,
  p_horizon text
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_inputs_hash text;
  v_existing int := 0;
  v_inserted int := 0;
begin
  -- service-role only (compute/write boundary)
  if auth.role() <> 'service_role' then
    raise exception 'forbidden: service_role required';
  end if;

  v_inputs_hash := public.rpc_recruiting_candidate_impacts_inputs_hash_v1(p_program_id, p_sport, p_horizon);

  if v_inputs_hash is null then
    return jsonb_build_object(
      'status', 'no_snapshot',
      'inputs_hash', null,
      'existing', 0,
      'inserted', 0
    );
  end if;

  select count(*) into v_existing
  from public.recruiting_candidate_impacts
  where program_id = p_program_id
    and sport = p_sport
    and horizon = p_horizon
    and inputs_hash = v_inputs_hash;

  if v_existing = 0 then
    v_inserted := public.materialize_recruiting_candidate_impacts(
      p_program_id,
      p_sport,
      p_horizon,
      v_inputs_hash
    );
  end if;

  return jsonb_build_object(
    'status', case when v_existing = 0 then 'computed' else 'cached' end,
    'inputs_hash', v_inputs_hash,
    'existing', v_existing,
    'inserted', v_inserted
  );
end;
$$;

comment on function public.rpc_recruiting_candidate_impacts_ensure_v1 is
'M3 service-role RPC: ensures candidate impacts exist for current inputs_hash (idempotent cache)';

-- expose ensure only to service_role via authenticated + role gate above (Supabase auth.role)
grant execute on function public.rpc_recruiting_candidate_impacts_ensure_v1(uuid, text, text) to authenticated;

commit;
