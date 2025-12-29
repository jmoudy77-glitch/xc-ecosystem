-- PROMOTION 27
-- 1) Backfill any remaining program_recruits.recruit_id nulls where recruiting_profile_id resolves.
-- 2) Validate the NOT VALID check constraint.

-- Ensure recruits row exists for any recruiting_profile-linked recruit_id (placeholder-safe)
insert into public.recruits (
  id,
  organization_id,
  first_name,
  last_name,
  grad_year,
  event_group,
  status,
  pipeline_stage,
  is_placeholder
)
select
  rp.athlete_id as id,
  coalesce(
    (select m.organization_id
     from public.program_members pm
     join public.memberships m on m.user_id = pm.user_id
     where pm.program_id = pr.program_id
     limit 1),
    (select m2.organization_id from public.memberships m2 limit 1)
  ) as organization_id,
  'Unknown' as first_name,
  'Recruit' as last_name,
  0 as grad_year,
  'unknown' as event_group,
  'active' as status,
  'new' as pipeline_stage,
  true as is_placeholder
from public.program_recruits pr
join public.recruiting_profiles rp on rp.id = pr.recruiting_profile_id
left join public.recruits r on r.id = rp.athlete_id
where pr.recruit_id is null
  and r.id is null
  and rp.athlete_id is not null
group by rp.athlete_id, pr.program_id
having coalesce(
  (select m.organization_id
   from public.program_members pm
   join public.memberships m on m.user_id = pm.user_id
   where pm.program_id = pr.program_id
   limit 1),
  (select m2.organization_id from public.memberships m2 limit 1)
) is not null
on conflict (id) do nothing;

update public.program_recruits pr
set recruit_id = rp.athlete_id
from public.recruiting_profiles rp
where pr.recruit_id is null
  and pr.recruiting_profile_id = rp.id
  and rp.athlete_id is not null;

-- If any still null, they must be explicitly resolved or archived before validation.
do $$
declare
  v_remaining integer;
begin
  select count(*) into v_remaining
  from public.program_recruits
  where recruit_id is null;

  if v_remaining > 0 then
    raise exception 'PROMOTION 27: % program_recruits rows still have recruit_id NULL; resolve/cleanup required before validation.', v_remaining;
  end if;

  alter table public.program_recruits
    validate constraint program_recruits_recruit_id_not_null_chk;
end $$;
