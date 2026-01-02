begin;

create table if not exists public.genesis_automation_executions (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.genesis_seasons(id) on delete cascade,
  law_id uuid not null references public.genesis_automation_laws(id) on delete cascade,
  tick_index bigint not null,
  executed_at timestamptz not null default now(),
  result_payload jsonb not null default '{}'::jsonb
);

create index if not exists genesis_automation_executions_season_tick_idx
  on public.genesis_automation_executions(season_id, tick_index);

create or replace function public.genesis_execute_automation_laws(
  p_season_id uuid,
  p_tick_index bigint
) returns void
language plpgsql
as $$
declare
  l record;
begin
  for l in
    select *
    from public.genesis_automation_laws
    where season_id = p_season_id
      and is_enabled = true
  loop
    insert into public.genesis_automation_executions(
      season_id, law_id, tick_index, result_payload
    )
    values (
      p_season_id, l.id, p_tick_index, l.law_config
    );
  end loop;
end;
$$;

commit;
