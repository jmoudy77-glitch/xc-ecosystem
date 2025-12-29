-- PROMOTION 14
-- We now project recruiting_score by (program_id, recruit_id).
-- This promotion backfills program_recruits.recruit_id using existing linkage:
-- program_recruits.recruiting_profile_id -> recruiting_profiles.athlete_id -> recruits.id
-- (This assumes the canonical recruit id is public.recruits.id AND recruiting_profiles.athlete_id is that same id.)

-- Backfill recruit_id where missing and resolvable
update public.program_recruits pr
set recruit_id = r.id
from public.recruiting_profiles rp
join public.recruits r on r.id = rp.athlete_id
where pr.recruit_id is null
  and pr.recruiting_profile_id = rp.id;

-- If some rows remain null, they are not resolvable with current linkage; leave nullable for now.

-- Enforce uniqueness when present (prevents duplicate board rows for same recruit in same program)
create unique index if not exists program_recruits_unique_program_recruit
  on public.program_recruits(program_id, recruit_id)
  where recruit_id is not null;

-- Add FK for referential integrity (only if recruit_id is used)
do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'program_recruits'
      and constraint_name = 'program_recruits_recruit_id_fkey'
  ) then
    alter table public.program_recruits
      add constraint program_recruits_recruit_id_fkey
      foreign key (recruit_id) references public.recruits(id)
      on delete set null;
  end if;
end $$;

