-- Inject sector_key into program_health_snapshots.full_payload.absences
-- by resolving capability_nodes.sector_key via capability_node_id

create or replace function public.ph_program_health_snapshots_inject_sector_key()
returns trigger
language plpgsql
as $$
declare
  abs jsonb;
begin
  if new.full_payload is null then
    return new;
  end if;

  abs := new.full_payload->'absences';

  if abs is null or jsonb_typeof(abs) <> 'array' then
    return new;
  end if;

  new.full_payload :=
    jsonb_set(
      new.full_payload,
      '{absences}',
      (
        select coalesce(
          jsonb_agg(
            case
              when (a->>'sector_key') is not null and (a->>'sector_key') <> '' then a
              else
                jsonb_set(
                  a,
                  '{sector_key}',
                  to_jsonb(
                    (
                      select cn.sector_key
                      from public.capability_nodes cn
                      where cn.id = nullif(a->>'capability_node_id','')::uuid
                      limit 1
                    )
                  ),
                  true
                )
            end
          ),
          '[]'::jsonb
        )
        from jsonb_array_elements(abs) as a
      ),
      true
    );

  return new;
end;
$$;

drop trigger if exists trg_ph_program_health_snapshots_inject_sector_key
on public.program_health_snapshots;

create trigger trg_ph_program_health_snapshots_inject_sector_key
before insert or update of full_payload
on public.program_health_snapshots
for each row
execute function public.ph_program_health_snapshots_inject_sector_key();
