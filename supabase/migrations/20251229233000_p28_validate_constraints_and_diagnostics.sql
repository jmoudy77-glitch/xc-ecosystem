-- PROMOTION 28
-- 1) Validate any remaining NOT VALID constraints we introduced (idempotent).
-- 2) Provide a diagnostic view for closure checks.

-- Validate program_recruits recruit_id non-null check (safe if already validated)
do $$
begin
  if exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'program_recruits'
      and c.conname = 'program_recruits_recruit_id_not_null_chk'
      and c.convalidated = false
  ) then
    alter table public.program_recruits
      validate constraint program_recruits_recruit_id_not_null_chk;
  end if;
end $$;

-- Validate recruiting_ledger recruit_id FK (safe if already validated)
do $$
begin
  if exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'recruiting_ledger'
      and c.conname = 'recruiting_ledger_recruit_id_fkey'
      and c.convalidated = false
  ) then
    alter table public.recruiting_ledger
      validate constraint recruiting_ledger_recruit_id_fkey;
  end if;
end $$;

-- One-query diagnostic view: proves closure across key surfaces.
create or replace view public.recruiting_integrity_diagnostics_v1 as
select
  (select count(*) from public.recruiting_ledger rl left join public.recruits r on r.id = rl.recruit_id where r.id is null) as orphan_recruiting_ledger_recruit_ids,
  (select count(*) from public.program_recruits pr where pr.recruit_id is null) as null_program_recruits_recruit_id,
  (select count(*) from public.program_recruits pr left join public.recruits r on r.id = pr.recruit_id where pr.recruit_id is not null and r.id is null) as orphan_program_recruits_recruit_ids,
  (select count(*) from public.recruiting_snapshots rs left join public.recruits r on r.id = rs.recruit_id where r.id is null) as orphan_recruiting_snapshots_recruit_ids;

grant select on public.recruiting_integrity_diagnostics_v1 to authenticated;

