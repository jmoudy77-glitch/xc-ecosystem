-- Backfill sector_key into existing program_health_snapshots.full_payload->absences[]
-- by reading capability_nodes.sector_key for each absence.capability_node_id.
-- This avoids requiring a manual "touch" of program_health_absences rows.

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'program_health_snapshots'
      and column_name = 'full_payload'
  ) then
    raise exception 'public.program_health_snapshots.full_payload column not found';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'capability_nodes'
      and column_name = 'sector_key'
  ) then
    raise exception 'public.capability_nodes.sector_key column not found';
  end if;
end$$;

with rebuilt as (
  select
    s.id as snapshot_id,
    jsonb_set(
      s.full_payload,
      '{absences}',
      coalesce(
        (
          select jsonb_agg(
            case
              when cn.sector_key is not null
                then a.elem || jsonb_build_object('sector_key', cn.sector_key)
              else a.elem
            end
            order by a.ord
          )
          from jsonb_array_elements(coalesce(s.full_payload->'absences', '[]'::jsonb)) with ordinality as a(elem, ord)
          left join public.capability_nodes cn
            on cn.id = nullif(a.elem->>'capability_node_id','')::uuid
        ),
        '[]'::jsonb
      ),
      true
    ) as new_full_payload
  from public.program_health_snapshots s
)
update public.program_health_snapshots s
set
  full_payload = r.new_full_payload,
  created_at = now()
from rebuilt r
where s.id = r.snapshot_id;
