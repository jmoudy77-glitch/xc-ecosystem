-- XC-Ecosystem Sovereign Runtime
-- Promotion 64: Bind A1 into Recruiting (causal linkage + recruiting ledger)

begin;

-- 1) Recruiting ledger (append-only). If your project already has a recruiting ledger, keep it and adapt the RPC.
create table if not exists public.recruiting_ledger (
  id uuid primary key default gen_random_uuid(),
  canonical_event_id uuid not null references public.canonical_events(id) on delete restrict,
  program_id uuid not null references public.programs(id) on delete restrict,
  recruit_id uuid not null,
  upstream_a1_canonical_event_id uuid not null references public.canonical_events(id) on delete restrict,
  inputs_hash text not null,
  result_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists recruiting_ledger_program_id_idx on public.recruiting_ledger(program_id);
create index if not exists recruiting_ledger_recruit_id_idx on public.recruiting_ledger(recruit_id);
create index if not exists recruiting_ledger_upstream_a1_idx on public.recruiting_ledger(upstream_a1_canonical_event_id);

-- 2) Causal link table (explicit graph edges between canonical events)
create table if not exists public.canonical_event_links (
  id uuid primary key default gen_random_uuid(),
  from_canonical_event_id uuid not null references public.canonical_events(id) on delete restrict,
  to_canonical_event_id uuid not null references public.canonical_events(id) on delete restrict,
  link_type text not null,
  created_at timestamptz not null default now(),
  unique(from_canonical_event_id, to_canonical_event_id, link_type)
);

create index if not exists canonical_event_links_from_idx on public.canonical_event_links(from_canonical_event_id);
create index if not exists canonical_event_links_to_idx on public.canonical_event_links(to_canonical_event_id);

-- 3) Kernel RPC: recruiting emission that is causally bound to an upstream A1 event
--    This enforces: canonical_event (recruiting) + recruiting_ledger + explicit edge to A1 event.
create or replace function public.kernel_recruiting_emit(
  p_program_id uuid,
  p_recruit_id uuid,
  p_inputs_hash text,
  p_result_payload jsonb,
  p_upstream_a1_canonical_event_id uuid,
  p_scope_id uuid default null,
  p_actor_user_id uuid default null
)
returns table (
  canonical_event_id uuid,
  ledger_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_ledger_id uuid;
begin
  if p_program_id is null then raise exception 'p_program_id is required'; end if;
  if p_recruit_id is null then raise exception 'p_recruit_id is required'; end if;
  if p_inputs_hash is null or length(trim(p_inputs_hash)) = 0 then raise exception 'p_inputs_hash is required'; end if;
  if p_result_payload is null then raise exception 'p_result_payload is required'; end if;
  if p_upstream_a1_canonical_event_id is null then raise exception 'p_upstream_a1_canonical_event_id is required'; end if;

  -- Verify upstream A1 event exists and is program-scoped (hard invariant)
  perform 1
  from public.canonical_events ce
  where ce.id = p_upstream_a1_canonical_event_id
    and ce.program_id = p_program_id
    and ce.event_type = 'program_health.a1_evaluated';

  if not found then
    raise exception 'Upstream A1 canonical event not found or not program-scoped: %', p_upstream_a1_canonical_event_id;
  end if;

  -- Canonical event first
  insert into public.canonical_events (
    program_id,
    event_domain,
    event_type,
    scope_type,
    scope_id,
    actor_user_id,
    payload
  ) values (
    p_program_id,
    'recruiting',
    'recruiting.recruit_evaluated',
    'program',
    p_scope_id,
    p_actor_user_id,
    jsonb_build_object(
      'recruit_id', p_recruit_id,
      'inputs_hash', p_inputs_hash,
      'upstream_a1_canonical_event_id', p_upstream_a1_canonical_event_id,
      'result_payload', p_result_payload
    )
  )
  returning id into v_event_id;

  -- Ledger row (append-only)
  insert into public.recruiting_ledger (
    canonical_event_id,
    program_id,
    recruit_id,
    upstream_a1_canonical_event_id,
    inputs_hash,
    result_payload
  ) values (
    v_event_id,
    p_program_id,
    p_recruit_id,
    p_upstream_a1_canonical_event_id,
    p_inputs_hash,
    p_result_payload
  )
  returning id into v_ledger_id;

  -- Explicit causal edge: A1 → Recruiting
  insert into public.canonical_event_links (
    from_canonical_event_id,
    to_canonical_event_id,
    link_type
  ) values (
    p_upstream_a1_canonical_event_id,
    v_event_id,
    'a1_to_recruiting'
  )
  on conflict do nothing;

  canonical_event_id := v_event_id;
  ledger_id := v_ledger_id;
  return next;
end;
$$;

commit;
