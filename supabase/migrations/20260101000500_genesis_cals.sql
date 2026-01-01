begin;

create table if not exists public.genesis_automation_laws (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.genesis_seasons(id) on delete cascade,
  law_key text not null,
  law_config jsonb not null default '{}'::jsonb,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists genesis_automation_laws_season_key_ux
  on public.genesis_automation_laws(season_id, law_key);

create or replace function public.genesis_register_automation_law(
  p_season_id uuid,
  p_law_key text,
  p_law_config jsonb default '{}'::jsonb,
  p_is_enabled boolean default true
) returns uuid
language plpgsql
as $$
declare v_id uuid;
begin
  insert into public.genesis_automation_laws(
    season_id, law_key, law_config, is_enabled
  ) values (
    p_season_id, p_law_key, coalesce(p_law_config,'{}'::jsonb), coalesce(p_is_enabled,true)
  )
  on conflict (season_id, law_key) do update
    set law_config = excluded.law_config,
        is_enabled = excluded.is_enabled
  returning id into v_id;

  return v_id;
end;
$$;

commit;
