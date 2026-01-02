create table if not exists public.genesis_closure_seals (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null,
  phase text not null,
  seal_version integer not null default 1,
  sealed_at timestamptz not null default now(),
  notes text
);

create unique index if not exists uq_genesis_closure_seals_program_phase
on public.genesis_closure_seals(program_id, phase);

create or replace function public.ops_genesis_phase3_seal(p_program_id uuid, p_notes text default null)
returns jsonb
language plpgsql
as $$
declare
  v_now timestamptz := now();
  v_id uuid;
begin
  insert into public.genesis_closure_seals(program_id, phase, seal_version, sealed_at, notes)
  values (p_program_id, 'phase3', 1, v_now, p_notes)
  on conflict (program_id, phase) do update
    set sealed_at = excluded.sealed_at,
        notes = excluded.notes
  returning id into v_id;

  return jsonb_build_object(
    'program_id', p_program_id,
    'phase', 'phase3',
    'seal_version', 1,
    'sealed_at', v_now,
    'seal_id', v_id
  );
end;
$$;
