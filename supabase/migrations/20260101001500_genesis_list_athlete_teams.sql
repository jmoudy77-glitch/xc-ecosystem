begin;

create or replace function public.genesis_list_athlete_teams(
  p_athlete_id uuid
) returns jsonb
language plpgsql
as $$
declare
  v jsonb;
begin
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'binding', to_jsonb(rb),
        'team', to_jsonb(t)
      )
      order by rb.created_at
    ),
    '[]'::jsonb
  )
  into v
  from public.genesis_roster_bindings rb
  join public.genesis_teams t on t.id = rb.team_id
  where rb.athlete_id = p_athlete_id;

  return v;
end;
$$;

revoke all on function public.genesis_list_athlete_teams(uuid) from public;
grant execute on function public.genesis_list_athlete_teams(uuid) to authenticated;
grant execute on function public.genesis_list_athlete_teams(uuid) to service_role;

commit;
