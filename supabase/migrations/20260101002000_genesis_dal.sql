begin;

create table if not exists public.genesis_audit_ledger (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.genesis_seasons(id) on delete cascade,
  tick_index bigint not null,
  entity_type text not null,
  entity_id uuid not null,
  action_type text not null,
  action_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists genesis_audit_ledger_season_tick_idx
  on public.genesis_audit_ledger(season_id, tick_index);

create or replace function public.genesis_record_audit(
  p_season_id uuid,
  p_tick_index bigint,
  p_entity_type text,
  p_entity_id uuid,
  p_action_type text,
  p_action_payload jsonb default '{}'::jsonb
) returns void
language plpgsql
as $$
begin
  insert into public.genesis_audit_ledger(
    season_id, tick_index, entity_type, entity_id, action_type, action_payload
  )
  values (p_season_id, p_tick_index, p_entity_type, p_entity_id, p_action_type, coalesce(p_action_payload,'{}'::jsonb));
end;
$$;

commit;
