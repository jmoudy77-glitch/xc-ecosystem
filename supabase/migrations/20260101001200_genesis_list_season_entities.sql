begin;

create or replace function public.genesis_list_season_entities(
  p_season_id uuid
) returns jsonb
language plpgsql
as $$
declare
  v jsonb;
begin
  select jsonb_build_object(
    'teams', coalesce((select jsonb_agg(to_jsonb(t) order by t.team_code) from public.genesis_teams t where t.season_id = p_season_id), '[]'::jsonb),
    'athletes', coalesce((select jsonb_agg(to_jsonb(a) order by a.athlete_code) from public.genesis_athletes a where a.season_id = p_season_id), '[]'::jsonb),
    'roster_bindings', coalesce((
      select jsonb_agg(to_jsonb(rb) order by rb.created_at)
      from public.genesis_roster_bindings rb
      where rb.season_id = p_season_id
    ), '[]'::jsonb)
  )
  into v;

  return v;
end;
$$;

revoke all on function public.genesis_list_season_entities(uuid) from public;
grant execute on function public.genesis_list_season_entities(uuid) to authenticated;
grant execute on function public.genesis_list_season_entities(uuid) to service_role;

commit;
