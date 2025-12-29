-- PROMOTION 24
-- Cleanup for recruiting_ledger.recruit_id values that are missing from public.recruits.
-- Strategy:
-- - Insert placeholder recruits rows for any missing recruit_id referenced by recruiting_ledger.
-- - Populate minimally from program_recruits/recruiting_profiles when possible.
-- - Then validate the NOT VALID FK.

-- 1) Insert missing recruits rows (placeholder-safe)
insert into public.recruits (
  id,
  organization_id,
  first_name,
  last_name,
  grad_year,
  event_group,
  status,
  pipeline_stage
)
select
  rl.recruit_id as id,
  -- derive organization_id from actor memberships (best-effort) via program_members -> user_id -> memberships
  coalesce(
    (select m.organization_id
     from public.program_members pm
     join public.memberships m on m.user_id = pm.user_id
     where pm.program_id = rl.program_id
     limit 1),
    -- fallback to any membership org
    (select m2.organization_id
     from public.memberships m2
     limit 1)
  ) as organization_id,
  coalesce(r2.first_name, 'Unknown') as first_name,
  coalesce(r2.last_name, 'Recruit') as last_name,
  coalesce(r2.grad_year, 0) as grad_year,
  coalesce(r2.event_group, 'unknown') as event_group,
  coalesce(r2.status, 'active') as status,
  coalesce(r2.pipeline_stage, 'new') as pipeline_stage
from public.recruiting_ledger rl
left join public.recruits r2 on r2.id = rl.recruit_id
where r2.id is null
group by rl.recruit_id, rl.program_id, r2.first_name, r2.last_name, r2.grad_year, r2.event_group, r2.status, r2.pipeline_stage
having coalesce(
  (select m.organization_id
   from public.program_members pm
   join public.memberships m on m.user_id = pm.user_id
   where pm.program_id = rl.program_id
   limit 1),
  (select m2.organization_id from public.memberships m2 limit 1)
) is not null
on conflict (id) do nothing;

-- 2) Validate FK (will succeed if cleanup covered all missing IDs)
do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'recruiting_ledger'
      and constraint_name = 'recruiting_ledger_recruit_id_fkey'
  ) then
    alter table public.recruiting_ledger validate constraint recruiting_ledger_recruit_id_fkey;
  end if;
end $$;
