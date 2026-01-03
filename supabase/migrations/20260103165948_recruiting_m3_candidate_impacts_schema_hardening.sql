-- recruiting(m3): candidate impact schema hardening + rls
-- NOTE: idempotent where possible; safe to run if table already exists.

begin;

create table if not exists public.recruiting_candidate_impacts (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null,
  recruit_id uuid not null,
  sport text not null check (sport = any (array['xc','tf'])),
  horizon text not null check (horizon = any (array['H0','H1','H2','H3'])),
  capability_node_id uuid not null,
  impact_score numeric not null check (impact_score >= 0),
  cohort_tier integer not null check (cohort_tier >= 0 and cohort_tier <= 3),
  rationale jsonb not null default '{}'::jsonb,
  inputs_hash text not null,
  created_at timestamptz not null default now(),
  canonical_event_id uuid
);

-- ensure FKs (best-effort; ignore if already present with different names)
do $$
begin
  begin
    alter table public.recruiting_candidate_impacts
      add constraint recruiting_candidate_impacts_program_id_fkey
      foreign key (program_id) references public.programs(id) on delete cascade;
  exception when duplicate_object then null;
  end;

  begin
    alter table public.recruiting_candidate_impacts
      add constraint recruiting_candidate_impacts_recruit_id_fkey
      foreign key (recruit_id) references public.recruits(id) on delete cascade;
  exception when duplicate_object then null;
  end;

  begin
    alter table public.recruiting_candidate_impacts
      add constraint recruiting_candidate_impacts_capability_node_id_fkey
      foreign key (capability_node_id) references public.capability_nodes(id) on delete restrict;
  exception when duplicate_object then null;
  end;

  begin
    alter table public.recruiting_candidate_impacts
      add constraint recruiting_candidate_impacts_canonical_event_id_fkey
      foreign key (canonical_event_id) references public.canonical_events(id) on delete set null;
  exception when duplicate_object then null;
  end;
end $$;

-- uniqueness for a single compute version (inputs_hash) per candidate×deficit×horizon
do $$
begin
  begin
    alter table public.recruiting_candidate_impacts
      add constraint recruiting_candidate_impacts_unique_version
      unique (program_id, recruit_id, sport, horizon, capability_node_id, inputs_hash);
  exception when duplicate_object then null;
  end;
end $$;

create index if not exists recruiting_candidate_impacts_program_horizon_idx
  on public.recruiting_candidate_impacts (program_id, sport, horizon);

create index if not exists recruiting_candidate_impacts_program_capability_idx
  on public.recruiting_candidate_impacts (program_id, capability_node_id);

create index if not exists recruiting_candidate_impacts_program_tier_idx
  on public.recruiting_candidate_impacts (program_id, cohort_tier);

create index if not exists recruiting_candidate_impacts_created_at_idx
  on public.recruiting_candidate_impacts (created_at desc);

-- RLS
alter table public.recruiting_candidate_impacts enable row level security;

-- read: any authenticated program member can read their program rows
drop policy if exists "recruiting_candidate_impacts_select_program_member" on public.recruiting_candidate_impacts;
create policy "recruiting_candidate_impacts_select_program_member"
on public.recruiting_candidate_impacts
for select
to authenticated
using (
  exists (
    select 1
    from public.program_members pm
    where pm.program_id = recruiting_candidate_impacts.program_id
      and pm.user_id = auth.uid()
  )
);

-- write: service_role only (compute is server-owned)
drop policy if exists "recruiting_candidate_impacts_write_service_role" on public.recruiting_candidate_impacts;
create policy "recruiting_candidate_impacts_write_service_role"
on public.recruiting_candidate_impacts
for all
to authenticated
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

commit;
