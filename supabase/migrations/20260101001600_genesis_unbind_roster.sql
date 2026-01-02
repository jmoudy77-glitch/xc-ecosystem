begin;

create or replace function public.genesis_unbind_roster(
  p_season_id uuid,
  p_team_id uuid,
  p_athlete_id uuid
) returns void
language plpgsql
as $$
begin
  perform public.genesis_assert_season_open(p_season_id);
  perform public.genesis_assert_team_in_season(p_season_id, p_team_id);
  perform public.genesis_assert_athlete_in_season(p_season_id, p_athlete_id);

  delete from public.genesis_roster_bindings rb
  where rb.season_id = p_season_id
    and rb.team_id = p_team_id
    and rb.athlete_id = p_athlete_id;

  if not found then
    raise exception 'roster binding not found';
  end if;
end;
$$;

revoke all on function public.genesis_unbind_roster(uuid,uuid,uuid) from public;
grant execute on function public.genesis_unbind_roster(uuid,uuid,uuid) to authenticated;
grant execute on function public.genesis_unbind_roster(uuid,uuid,uuid) to service_role;

commit;
