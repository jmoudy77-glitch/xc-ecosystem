-- Performance indexes for Recruiting M1 read path
-- Optimizes recruitable-only filtering and program/sport/horizon lookups

create index if not exists idx_ph_absences_recruitable
on public.program_health_absences
((details->>'recruitability'))
where details->>'recruitability' = 'recruitable';

create index if not exists idx_ph_absences_program_sport_horizon_recruitable
on public.program_health_absences (program_id, sport, horizon)
where details->>'recruitability' = 'recruitable';

comment on index idx_ph_absences_recruitable is
'Partial index for recruitable absences only';

comment on index idx_ph_absences_program_sport_horizon_recruitable is
'Composite partial index to accelerate Recruiting RPC lookups';
