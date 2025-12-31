begin;

-- 1) Add canonical columns if absent.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='program_health_absences' and column_name='capability_node_id'
  ) then
    alter table public.program_health_absences
      add column capability_node_id uuid null;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='program_health_absences' and column_name='absence_type'
  ) then
    alter table public.program_health_absences
      add column absence_type text null;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='program_health_absences' and column_name='severity'
  ) then
    alter table public.program_health_absences
      add column severity integer null;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='program_health_absences' and column_name='cause_event_id'
  ) then
    alter table public.program_health_absences
      add column cause_event_id uuid null;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='program_health_absences' and column_name='notes'
  ) then
    alter table public.program_health_absences
      add column notes text null;
  end if;
end $$;

-- 2) Indexes for UI read path
create index if not exists idx_pha_program on public.program_health_absences(program_id);
create index if not exists idx_pha_program_node on public.program_health_absences(program_id, capability_node_id);
create index if not exists idx_pha_program_horizon on public.program_health_absences(program_id, horizon);

-- 3) Collapse phantom rows that are not lawful absences.
-- These were created prior to node-anchored canon.
delete from public.program_health_absences
where absence_key like 'genesis_world_a:%'
   or absence_key like 'ui_smoke_%'
   or absence_key like 'dev_smoke_%';

-- 4) Ensure horizons are normalized (if horizon exists as text)
-- No-op if already constrained elsewhere; keep safe.
update public.program_health_absences
set horizon = upper(horizon)
where horizon is not null;

commit;
