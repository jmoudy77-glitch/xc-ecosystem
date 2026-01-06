begin;

-- -----------------------------------------------------------------------------
-- meet_roster_athletes: roster membership (child table)
-- -----------------------------------------------------------------------------
create table if not exists public.meet_roster_athletes (
  id uuid primary key default gen_random_uuid(),
  meet_id uuid not null references public.meets(id) on delete cascade,
  program_id uuid not null,
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  attendance_state text not null default 'attending'
    check (attendance_state in ('attending')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (meet_id, program_id, athlete_id)
);

create index if not exists meet_roster_athletes_meet_program_idx
  on public.meet_roster_athletes(meet_id, program_id);

create index if not exists meet_roster_athletes_program_idx
  on public.meet_roster_athletes(program_id);

create index if not exists meet_roster_athletes_athlete_idx
  on public.meet_roster_athletes(athlete_id);

alter table public.meet_roster_athletes enable row level security;

-- -----------------------------------------------------------------------------
-- RLS: program member + program is participant in meet
-- Uses helpers created in 20260106131500 schema lock phase 1:
--   mm_is_program_member(p_program_id)
--   mm_is_program_participant(p_meet_id, p_program_id)
-- -----------------------------------------------------------------------------
drop policy if exists mm_meet_roster_athletes_select on public.meet_roster_athletes;
create policy mm_meet_roster_athletes_select
on public.meet_roster_athletes
for select
to authenticated
using (
  public.mm_is_program_member(program_id)
  and public.mm_is_program_participant(meet_id, program_id)
);

drop policy if exists mm_meet_roster_athletes_insert on public.meet_roster_athletes;
create policy mm_meet_roster_athletes_insert
on public.meet_roster_athletes
for insert
to authenticated
with check (
  public.mm_is_program_member(program_id)
  and public.mm_is_program_participant(meet_id, program_id)
);

drop policy if exists mm_meet_roster_athletes_delete on public.meet_roster_athletes;
create policy mm_meet_roster_athletes_delete
on public.meet_roster_athletes
for delete
to authenticated
using (
  public.mm_is_program_member(program_id)
  and public.mm_is_program_participant(meet_id, program_id)
);

commit;
