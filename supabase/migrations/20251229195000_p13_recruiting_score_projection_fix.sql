-- PROMOTION 13
-- Goal:
-- 1) Ensure the global recruit surface can receive recruiting_score (public.recruits)
-- 2) Ensure the program-scoped surface can receive recruiting_score keyed by recruit_id (public.program_recruits)
-- 3) Update projection trigger to project by NEW.recruit_id (not athlete_id)

-- Global recruit surface projection
alter table public.recruits
  add column if not exists recruiting_score numeric;

-- Program-scoped surface needs recruit_id to project by recruit identity
alter table public.program_recruits
  add column if not exists recruit_id uuid;

-- Helpful index for program board queries
create index if not exists program_recruits_program_recruit_idx
  on public.program_recruits(program_id, recruit_id);

-- Replace trigger function to project into both surfaces
create or replace function public.project_recruiting_snapshot()
returns trigger
language plpgsql
as $$
declare
  v_score numeric;
  v_confidence numeric;
  v_horizon text;
begin
  v_score := nullif(coalesce(
    (NEW.result_payload->>'recruiting_score'),
    (NEW.result_payload->>'score')
  ), '')::numeric;

  v_confidence := nullif(coalesce(
    (NEW.result_payload->>'confidence'),
    (NEW.result_payload->>'ai_confidence')
  ), '')::numeric;

  v_horizon := nullif(coalesce(
    (NEW.result_payload->>'horizon'),
    (NEW.result_payload->>'a1_horizon')
  ), '');

  insert into public.recruiting_snapshots (
    canonical_event_id,
    program_id,
    recruit_id,
    upstream_a1_canonical_event_id,
    recruiting_score,
    confidence,
    horizon,
    result_payload
  )
  values (
    NEW.canonical_event_id,
    NEW.program_id,
    NEW.recruit_id,
    NEW.upstream_a1_canonical_event_id,
    v_score,
    v_confidence,
    v_horizon,
    NEW.result_payload
  );

  -- Project onto global recruit record
  update public.recruits r
    set recruiting_score = v_score
  where r.id = NEW.recruit_id;

  -- Project onto program-scoped board surface (by program_id + recruit_id)
  update public.program_recruits pr
    set recruiting_score = v_score
  where pr.program_id = NEW.program_id
    and pr.recruit_id = NEW.recruit_id;

  return NEW;
end;
$$;

-- Ensure trigger exists (idempotent)
drop trigger if exists trg_project_recruiting_snapshot on public.recruiting_ledger;

create trigger trg_project_recruiting_snapshot
after insert on public.recruiting_ledger
for each row execute function public.project_recruiting_snapshot();

