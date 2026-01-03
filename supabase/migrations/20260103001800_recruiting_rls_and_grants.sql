-- Recruiting M1–M3 security hardening
-- Enable RLS and grant least-privilege access for read RPCs

-- recruiting_state_signals
alter table public.recruiting_state_signals enable row level security;

create policy "recruiting_state_signals_program_read"
on public.recruiting_state_signals
for select
using (
  program_id in (
    select pm.program_id
    from public.program_members pm
    where pm.user_id = auth.uid()
  )
);

-- recruiting_candidate_impacts
alter table public.recruiting_candidate_impacts enable row level security;

create policy "recruiting_candidate_impacts_program_read"
on public.recruiting_candidate_impacts
for select
using (
  program_id in (
    select pm.program_id
    from public.program_members pm
    where pm.user_id = auth.uid()
  )
);

-- program_health_absences (read via view/RPC only; no direct writes)
alter table public.program_health_absences enable row level security;

create policy "ph_absences_program_read"
on public.program_health_absences
for select
using (
  program_id in (
    select pm.program_id
    from public.program_members pm
    where pm.user_id = auth.uid()
  )
);

-- Grants for RPC execution
grant execute on function public.rpc_recruiting_recruitable_deficits(uuid, text, text) to authenticated;
grant execute on function public.rpc_recruiting_latest_state_signal(uuid, text, text) to authenticated;
grant execute on function public.rpc_recruiting_ranked_candidates(uuid, text, text, integer) to authenticated;

comment on policy recruiting_state_signals_program_read on public.recruiting_state_signals is
'Allow program members to read recruiting stabilization signals for their program.';

comment on policy recruiting_candidate_impacts_program_read on public.recruiting_candidate_impacts is
'Allow program members to read advisory candidate impact estimates for their program.';

comment on policy ph_absences_program_read on public.program_health_absences is
'Allow program members to read program health absences (consumed indirectly by Recruiting).';
