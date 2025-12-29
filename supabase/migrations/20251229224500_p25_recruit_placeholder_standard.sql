-- PROMOTION 25
-- Standardize placeholder recruits minted for orphan recruiting_ledger rows.
-- Adds a marker + enforces stable defaults for required constrained fields.

-- Marker column
alter table public.recruits
  add column if not exists is_placeholder boolean not null default false;

-- Ensure safe defaults for constrained fields on placeholders
-- (Only touch rows that are already placeholders or are missing canonical details.)
update public.recruits
set
  pipeline_stage = coalesce(nullif(pipeline_stage, ''), 'new'),
  interest_level = coalesce(interest_level, 3),
  probability = coalesce(probability, 0.25),
  is_placeholder = true
where
  -- candidates: recruits that were minted with unknown identity OR missing required constrained fields
  (first_name = 'Unknown' or last_name = 'Recruit' or event_group = 'unknown' or grad_year = 0)
  and (is_placeholder = false);

-- Harden the recruiting_ledger recruit_id FK to VALID if it exists and is not yet validated.
do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'recruiting_ledger'
      and constraint_name = 'recruiting_ledger_recruit_id_fkey'
  ) then
    -- validate is idempotent if already validated
    alter table public.recruiting_ledger validate constraint recruiting_ledger_recruit_id_fkey;
  end if;
end $$;

