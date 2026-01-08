-- supabase/migrations/20260108195500_recruiting_slot_primary_backfill.sql

with slots_missing_primary as (
  select
    program_id,
    sport,
    event_group_key,
    slot_id
  from public.recruiting_slot_assignments
  group by program_id, sport, event_group_key, slot_id
  having bool_or(is_primary) = false
),
first_assignments as (
  select distinct on (rsa.program_id, rsa.sport, rsa.event_group_key, rsa.slot_id)
    rsa.program_id,
    rsa.sport,
    rsa.event_group_key,
    rsa.slot_id,
    rsa.athlete_id
  from public.recruiting_slot_assignments rsa
  join slots_missing_primary smp
    on smp.program_id = rsa.program_id
   and smp.sport = rsa.sport
   and smp.event_group_key = rsa.event_group_key
   and smp.slot_id = rsa.slot_id
  order by
    rsa.program_id,
    rsa.sport,
    rsa.event_group_key,
    rsa.slot_id,
    rsa.created_at asc,
    rsa.athlete_id asc
)
update public.recruiting_slot_assignments rsa
set is_primary = true
from first_assignments fa
where rsa.program_id = fa.program_id
  and rsa.sport = fa.sport
  and rsa.event_group_key = fa.event_group_key
  and rsa.slot_id = fa.slot_id
  and rsa.athlete_id = fa.athlete_id;
