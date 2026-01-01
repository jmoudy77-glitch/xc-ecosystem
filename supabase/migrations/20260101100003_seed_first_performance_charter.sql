begin;

-- Seed a deterministic first Performance Season Runtime Charter

do $$
declare
  v_genesis_id uuid;
  v_system_principal uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  v_charter_id uuid;
begin
  select id into v_genesis_id
  from public.runtimes
  where runtime_type = 'genesis'
  limit 1;

  if v_genesis_id is null then
    raise exception 'Genesis runtime not found.';
  end if;

  if not exists (
    select 1 from public.runtime_charters
    where runtime_type = 'performance_season'
      and parent_runtime_id = v_genesis_id
    limit 1
  ) then
    insert into public.runtime_charters (
      parent_runtime_id,
      runtime_type,
      temporal_scope,
      identity_seeds,
      requested_authorities,
      submitted_by_actor_type,
      submitted_by_actor_id,
      status
    ) values (
      v_genesis_id,
      'performance_season',
      jsonb_build_object('scope','season','note','initial seed'),
      jsonb_build_object('team', true, 'athlete', true, 'event_group', true),
      jsonb_build_object('program_authority', true, 'coach_authority', true, 'athlete_authority', true),
      'system',
      v_system_principal,
      'submitted'
    )
    returning id into v_charter_id;
  end if;

end $$;

commit;
