-- Recruiting M1 validation
-- Ensures contracts are enforceable at the data layer

-- 1) Assert no non-recruitable absences leak into recruiting view
create or replace view public.recruiting_m1_validation_no_leak as
select count(*) as non_recruitable_leak_count
from public.recruiting_recruitable_deficits
where recruitability <> 'recruitable';

-- 2) Assert stabilization status always returns exactly one row
create or replace function public.rpc_recruiting_m1_validation_status_rowcount(
  p_program_id uuid,
  p_sport text,
  p_horizon text default null
)
returns integer
language sql
stable
as $$
  select count(*)
  from public.rpc_recruiting_stabilization_status(p_program_id, p_sport, p_horizon);
$$;

comment on view public.recruiting_m1_validation_no_leak is
'Validation: recruiting view must never expose non-recruitable absences.';

comment on function public.rpc_recruiting_m1_validation_status_rowcount is
'Validation: stabilization status RPC must return exactly one row.';
