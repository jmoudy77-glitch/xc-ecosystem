-- program_health: ensure capability_nodes exist for absences that reference a capability_node_id

begin;

create or replace function public.program_health_ensure_capability_node_exists()
returns trigger
language plpgsql
as $$
declare
  v_exists boolean;
  v_node_code text;
  v_name text;
begin
  if new.capability_node_id is null then
    return new;
  end if;

  select exists(
    select 1
    from public.capability_nodes cn
    where cn.id = new.capability_node_id
  ) into v_exists;

  if v_exists then
    return new;
  end if;

  -- deterministic stub code (stable, readable)
  v_node_code := 'stub_' || replace(left(new.capability_node_id::text, 8), '-', '');

  -- best-effort label from details; fall back to absence_type; final fall back
  v_name := nullif(coalesce(
    new.details->>'capability_name',
    new.details->>'capability_label',
    new.details->>'name',
    new.absence_type,
    'Unknown Capability'
  ), '');

  insert into public.capability_nodes (
    id,
    program_id,
    node_code,
    name,
    scope_type,
    description,
    is_active,
    created_at,
    updated_at
  )
  values (
    new.capability_node_id,
    new.program_id,
    v_node_code,
    v_name,
    'program',
    'Auto-stubbed from program_health_absences reference.',
    true,
    now(),
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_program_health_absences_ensure_cap_node on public.program_health_absences;

create trigger trg_program_health_absences_ensure_cap_node
before insert or update of capability_node_id on public.program_health_absences
for each row
execute function public.program_health_ensure_capability_node_exists();

commit;
