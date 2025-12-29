-- Derived read model: recruiting_snapshots
create table if not exists public.recruiting_snapshots (
  id uuid primary key default gen_random_uuid(),
  canonical_event_id uuid not null,
  program_id uuid not null,
  recruit_id uuid not null,
  horizon text not null,
  recruiting_score numeric not null,
  ai_confidence numeric not null,
  a1_canonical_event_id uuid not null,
  created_at timestamptz not null default now()
);

create index if not exists recruiting_snapshots_program_idx on public.recruiting_snapshots(program_id);
create index if not exists recruiting_snapshots_recruit_idx on public.recruiting_snapshots(recruit_id);
create index if not exists recruiting_snapshots_event_idx on public.recruiting_snapshots(canonical_event_id);

-- Downstream projection field
alter table public.program_recruits
  add column if not exists recruiting_score numeric;

-- Projection trigger
create or replace function public.project_recruiting_snapshot()
returns trigger
language plpgsql
as $$
begin
  insert into public.recruiting_snapshots (
    canonical_event_id,
    program_id,
    recruit_id,
    horizon,
    recruiting_score,
    ai_confidence,
    a1_canonical_event_id
  )
  values (
    NEW.canonical_event_id,
    NEW.program_id,
    NEW.recruit_id,
    NEW.horizon,
    NEW.recruiting_score,
    NEW.ai_confidence,
    NEW.a1_canonical_event_id
  );

  update public.program_recruits
    set recruiting_score = NEW.recruiting_score
  where recruit_id = NEW.recruit_id
    and program_id = NEW.program_id;

  return NEW;
end;
$$;

drop trigger if exists trg_project_recruiting_snapshot on public.recruiting_ledger;

create trigger trg_project_recruiting_snapshot
after insert on public.recruiting_ledger
for each row execute function public.project_recruiting_snapshot();
