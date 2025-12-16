-- Add roster_scenarios.status + single Active guardrail

begin;

-- 1) Status column with safe default
alter table public.roster_scenarios
  add column if not exists status text not null default 'draft';

-- 2) Allowed values
alter table public.roster_scenarios
  drop constraint if exists roster_scenarios_status_check;

alter table public.roster_scenarios
  add constraint roster_scenarios_status_check
  check (status in ('draft', 'candidate', 'active'));

-- 3) Enforce: at most ONE active scenario per (program_id, team_id)
-- (Refine to per team_season_id later once roster_scenarios links to team_seasons.)
create unique index if not exists roster_scenarios_one_active_per_team
  on public.roster_scenarios (program_id, team_id)
  where status = 'active';

commit;