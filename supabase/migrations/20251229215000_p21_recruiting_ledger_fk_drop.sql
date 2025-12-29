-- PROMOTION 21 (adjustment)
-- Remove recruiting_ledger FK to recruits to keep projection flexible.

-- Drop FK if it exists (idempotent)
do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'recruiting_ledger'
      and constraint_name = 'recruiting_ledger_recruit_id_fkey'
  ) then
    alter table public.recruiting_ledger
      drop constraint recruiting_ledger_recruit_id_fkey;
  end if;
end $$;

