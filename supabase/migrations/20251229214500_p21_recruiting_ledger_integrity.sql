-- PROMOTION 21
-- Strengthen recruiting_ledger integrity/perf:
-- - FK recruiting_ledger.recruit_id -> recruits.id (if recruit_id is canonical recruit UUID)
-- - index on (program_id, recruit_id, created_at desc)

-- Index for latest-per-recruit queries
create index if not exists recruiting_ledger_program_recruit_created_idx
  on public.recruiting_ledger(program_id, recruit_id, created_at desc);
