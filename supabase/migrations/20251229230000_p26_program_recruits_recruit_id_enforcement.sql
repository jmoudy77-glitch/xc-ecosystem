-- PROMOTION 26
-- Goal: ensure program_recruits.recruit_id is always populated for new/updated rows.
-- Approach:
-- - BEFORE INSERT/UPDATE trigger that backfills recruit_id from recruiting_profile_id via recruiting_profiles.athlete_id
-- - Add a CHECK constraint (NOT VALID) to enforce non-null recruit_id for future rows, validate after legacy cleanup.

create or replace function public.program_recruits_backfill_recruit_id()
returns trigger
language plpgsql
as $$
begin
  if NEW.recruit_id is null and NEW.recruiting_profile_id is not null then
    select rp.athlete_id
      into NEW.recruit_id
    from public.recruiting_profiles rp
    where rp.id = NEW.recruiting_profile_id;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_program_recruits_backfill_recruit_id on public.program_recruits;

create trigger trg_program_recruits_backfill_recruit_id
before insert or update on public.program_recruits
for each row execute function public.program_recruits_backfill_recruit_id();

-- Enforce for future rows: recruit_id must be non-null
-- Use NOT VALID so existing legacy rows don't break immediately.
do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'program_recruits'
      and constraint_name = 'program_recruits_recruit_id_not_null_chk'
  ) then
    alter table public.program_recruits
      add constraint program_recruits_recruit_id_not_null_chk
      check (recruit_id is not null)
      not valid;
  end if;
end $$;

