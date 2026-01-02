begin;

create table if not exists public.genesis_events (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.genesis_seasons(id) on delete cascade,
  event_code text not null,
  event_label text not null,
  event_type text not null,
  event_time timestamptz not null,
  event_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists genesis_events_season_code_ux
  on public.genesis_events(season_id, event_code);

create or replace function public.genesis_mint_event(
  p_season_id uuid,
  p_event_code text,
  p_event_label text,
  p_event_type text,
  p_event_time timestamptz,
  p_event_payload jsonb default '{}'::jsonb
) returns uuid
language plpgsql
as $$
declare v_id uuid;
begin
  perform public.genesis_assert_season_not_closed(p_season_id);

  insert into public.genesis_events(
    season_id, event_code, event_label, event_type, event_time, event_payload
  ) values (
    p_season_id, p_event_code, p_event_label, p_event_type, p_event_time, coalesce(p_event_payload,'{}'::jsonb)
  ) returning id into v_id;

  return v_id;
end;
$$;

commit;
