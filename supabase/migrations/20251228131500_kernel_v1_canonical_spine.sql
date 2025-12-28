-- Kernel v1 — Canonical Event Spine + First RPC (Program Branding)

-- 0) Helper: resolve app user id from auth.uid()
-- Assumes public.users.auth_id stores the Supabase auth user id (uuid).
create or replace function public.current_app_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.id
  from public.users u
  where u.auth_id = auth.uid()
  limit 1
$$;

revoke all on function public.current_app_user_id() from public;
grant execute on function public.current_app_user_id() to authenticated;

-- 1) Canonical universal event spine
create table if not exists public.canonical_events (
  id uuid primary key default gen_random_uuid(),
  program_id uuid null references public.programs(id) on delete set null,
  event_domain text not null,
  event_type text not null,
  scope_type text not null,
  scope_id uuid null,
  actor_user_id uuid null references public.users(id) on delete set null,
  source_system text not null default 'rpc',
  causality jsonb not null default '{}'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists canonical_events_program_id_idx on public.canonical_events(program_id);
create index if not exists canonical_events_scope_idx on public.canonical_events(scope_type, scope_id);
create index if not exists canonical_events_domain_type_idx on public.canonical_events(event_domain, event_type);
create index if not exists canonical_events_created_at_idx on public.canonical_events(created_at desc);

alter table public.canonical_events enable row level security;

-- Read: program members can read program-scoped events
drop policy if exists "canonical_events_select_program_members" on public.canonical_events;
create policy "canonical_events_select_program_members"
on public.canonical_events
for select
to authenticated
using (
  program_id is not null
  and exists (
    select 1
    from public.program_members pm
    where pm.program_id = canonical_events.program_id
      and pm.user_id = public.current_app_user_id()
  )
);

-- Insert: allow server-side (authenticated) inserts only when actor is a program member
-- This keeps the kernel usable without relying on service role, while still limiting inserts.
drop policy if exists "canonical_events_insert_program_members" on public.canonical_events;
create policy "canonical_events_insert_program_members"
on public.canonical_events
for insert
to authenticated
with check (
  program_id is not null
  and actor_user_id = public.current_app_user_id()
  and exists (
    select 1
    from public.program_members pm
    where pm.program_id = canonical_events.program_id
      and pm.user_id = public.current_app_user_id()
  )
);

-- 2) AI causal ledger (created now; can be bound later)
create table if not exists public.ai_causal_ledger (
  id uuid primary key default gen_random_uuid(),
  canonical_event_id uuid not null unique references public.canonical_events(id) on delete cascade,
  model_version text not null,
  tier integer not null check (tier >= 0 and tier <= 3),
  inputs_fingerprint text not null,
  drivers_json jsonb not null default '{}'::jsonb,
  confidence numeric null check (confidence is null or (confidence >= 0 and confidence <= 1)),
  data_lineage jsonb not null default '{}'::jsonb,
  output_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ai_causal_ledger_created_at_idx on public.ai_causal_ledger(created_at desc);

alter table public.ai_causal_ledger enable row level security;

drop policy if exists "ai_causal_ledger_select_program_members" on public.ai_causal_ledger;
create policy "ai_causal_ledger_select_program_members"
on public.ai_causal_ledger
for select
to authenticated
using (
  exists (
    select 1
    from public.canonical_events ce
    join public.program_members pm
      on pm.program_id = ce.program_id
     and pm.user_id = public.current_app_user_id()
    where ce.id = ai_causal_ledger.canonical_event_id
  )
);

drop policy if exists "ai_causal_ledger_insert_via_kernel" on public.ai_causal_ledger;
create policy "ai_causal_ledger_insert_via_kernel"
on public.ai_causal_ledger
for insert
to authenticated
with check (
  exists (
    select 1
    from public.canonical_events ce
    join public.program_members pm
      on pm.program_id = ce.program_id
     and pm.user_id = public.current_app_user_id()
    where ce.id = ai_causal_ledger.canonical_event_id
  )
);

-- 3) Economic ledger (created now; can be bound later)
create table if not exists public.economic_ledger (
  id uuid primary key default gen_random_uuid(),
  canonical_event_id uuid not null unique references public.canonical_events(id) on delete cascade,
  ledger_type text not null, -- charge|refund|credit|debit|entitlement_grant|entitlement_revoke|adjustment
  amount numeric not null default 0,
  currency text not null default 'USD',
  external_ref text null, -- stripe event/subscription/payment intent id
  calculation_json jsonb not null default '{}'::jsonb,
  status text not null default 'pending', -- pending|settled|failed|reversed
  created_at timestamptz not null default now()
);

create index if not exists economic_ledger_created_at_idx on public.economic_ledger(created_at desc);

alter table public.economic_ledger enable row level security;

drop policy if exists "economic_ledger_select_program_members" on public.economic_ledger;
create policy "economic_ledger_select_program_members"
on public.economic_ledger
for select
to authenticated
using (
  exists (
    select 1
    from public.canonical_events ce
    join public.program_members pm
      on pm.program_id = ce.program_id
     and pm.user_id = public.current_app_user_id()
    where ce.id = economic_ledger.canonical_event_id
  )
);

drop policy if exists "economic_ledger_insert_via_kernel" on public.economic_ledger;
create policy "economic_ledger_insert_via_kernel"
on public.economic_ledger
for insert
to authenticated
with check (
  exists (
    select 1
    from public.canonical_events ce
    join public.program_members pm
      on pm.program_id = ce.program_id
     and pm.user_id = public.current_app_user_id()
    where ce.id = economic_ledger.canonical_event_id
  )
);

-- 4) Entitlement ledger (created now; can be bound later)
create table if not exists public.entitlement_ledger (
  id uuid primary key default gen_random_uuid(),
  canonical_event_id uuid not null unique references public.canonical_events(id) on delete cascade,
  beneficiary_type text not null, -- athlete|team_season|program|team_roster|other
  beneficiary_id uuid not null,
  entitlement_type text not null, -- scholarship|credit|aid|other
  value_json jsonb not null default '{}'::jsonb,
  status text not null default 'active', -- active|suspended|expired|revoked
  created_at timestamptz not null default now()
);

create index if not exists entitlement_ledger_created_at_idx on public.entitlement_ledger(created_at desc);

alter table public.entitlement_ledger enable row level security;

drop policy if exists "entitlement_ledger_select_program_members" on public.entitlement_ledger;
create policy "entitlement_ledger_select_program_members"
on public.entitlement_ledger
for select
to authenticated
using (
  exists (
    select 1
    from public.canonical_events ce
    join public.program_members pm
      on pm.program_id = ce.program_id
     and pm.user_id = public.current_app_user_id()
    where ce.id = entitlement_ledger.canonical_event_id
  )
);

drop policy if exists "entitlement_ledger_insert_via_kernel" on public.entitlement_ledger;
create policy "entitlement_ledger_insert_via_kernel"
on public.entitlement_ledger
for insert
to authenticated
with check (
  exists (
    select 1
    from public.canonical_events ce
    join public.program_members pm
      on pm.program_id = ce.program_id
     and pm.user_id = public.current_app_user_id()
    where ce.id = entitlement_ledger.canonical_event_id
  )
);

-- 5) Kernel RPC: upsert program_branding + emit canonical event (atomic)
create or replace function public.kernel_upsert_program_branding(
  p_program_id uuid,
  p_primary_color text default null,
  p_secondary_color text default null,
  p_accent_color text default null,
  p_background_color text default null,
  p_surface_color text default null,
  p_foreground_color text default null,
  p_muted_foreground_color text default null,
  p_success_color text default null,
  p_warning_color text default null,
  p_danger_color text default null,
  p_link_color text default null,
  p_logo_url text default null,
  p_wordmark_url text default null,
  p_mascot_name text default null,
  p_theme_mode text default null,
  p_metadata jsonb default null
)
returns table (
  canonical_event_id uuid,
  branding_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
  v_event_id uuid;
  v_branding_id uuid;
begin
  v_actor := public.current_app_user_id();
  if v_actor is null then
    raise exception 'kernel_upsert_program_branding: no app user for auth.uid()';
  end if;

  -- membership enforcement (constitutional gate)
  if not exists (
    select 1
    from public.program_members pm
    where pm.program_id = p_program_id
      and pm.user_id = v_actor
  ) then
    raise exception 'kernel_upsert_program_branding: actor not member of program %', p_program_id;
  end if;

  insert into public.canonical_events(
    program_id,
    event_domain,
    event_type,
    scope_type,
    scope_id,
    actor_user_id,
    source_system,
    causality,
    payload
  ) values (
    p_program_id,
    'kernel',
    'program_branding_upserted',
    'program',
    p_program_id,
    v_actor,
    'rpc',
    '{}'::jsonb,
    jsonb_build_object(
      'primary_color', p_primary_color,
      'secondary_color', p_secondary_color,
      'accent_color', p_accent_color,
      'background_color', p_background_color,
      'surface_color', p_surface_color,
      'foreground_color', p_foreground_color,
      'muted_foreground_color', p_muted_foreground_color,
      'success_color', p_success_color,
      'warning_color', p_warning_color,
      'danger_color', p_danger_color,
      'link_color', p_link_color,
      'logo_url', p_logo_url,
      'wordmark_url', p_wordmark_url,
      'mascot_name', p_mascot_name,
      'theme_mode', p_theme_mode,
      'metadata', coalesce(p_metadata, '{}'::jsonb)
    )
  ) returning id into v_event_id;

  insert into public.program_branding(
    program_id,
    primary_color,
    secondary_color,
    accent_color,
    background_color,
    surface_color,
    foreground_color,
    muted_foreground_color,
    success_color,
    warning_color,
    danger_color,
    link_color,
    logo_url,
    wordmark_url,
    mascot_name,
    theme_mode,
    metadata,
    updated_at
  )
  values (
    p_program_id,
    p_primary_color,
    p_secondary_color,
    p_accent_color,
    p_background_color,
    p_surface_color,
    p_foreground_color,
    p_muted_foreground_color,
    p_success_color,
    p_warning_color,
    p_danger_color,
    p_link_color,
    p_logo_url,
    p_wordmark_url,
    p_mascot_name,
    p_theme_mode,
    coalesce(p_metadata, '{}'::jsonb),
    now()
  )
  on conflict (program_id) do update set
    primary_color = coalesce(excluded.primary_color, program_branding.primary_color),
    secondary_color = coalesce(excluded.secondary_color, program_branding.secondary_color),
    accent_color = coalesce(excluded.accent_color, program_branding.accent_color),
    background_color = coalesce(excluded.background_color, program_branding.background_color),
    surface_color = coalesce(excluded.surface_color, program_branding.surface_color),
    foreground_color = coalesce(excluded.foreground_color, program_branding.foreground_color),
    muted_foreground_color = coalesce(excluded.muted_foreground_color, program_branding.muted_foreground_color),
    success_color = coalesce(excluded.success_color, program_branding.success_color),
    warning_color = coalesce(excluded.warning_color, program_branding.warning_color),
    danger_color = coalesce(excluded.danger_color, program_branding.danger_color),
    link_color = coalesce(excluded.link_color, program_branding.link_color),
    logo_url = coalesce(excluded.logo_url, program_branding.logo_url),
    wordmark_url = coalesce(excluded.wordmark_url, program_branding.wordmark_url),
    mascot_name = coalesce(excluded.mascot_name, program_branding.mascot_name),
    theme_mode = coalesce(excluded.theme_mode, program_branding.theme_mode),
    metadata = program_branding.metadata || excluded.metadata,
    updated_at = now()
  returning id into v_branding_id;

  canonical_event_id := v_event_id;
  branding_id := v_branding_id;
  return next;
end;
$$;

revoke all on function public.kernel_upsert_program_branding(
  uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, jsonb
) from public;

grant execute on function public.kernel_upsert_program_branding(
  uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, jsonb
) to authenticated;
