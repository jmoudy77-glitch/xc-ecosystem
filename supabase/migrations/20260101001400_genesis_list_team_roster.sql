begin;

create or replace function public.genesis_list_team_roster(
  p_team_id uuid
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
        'athlete', to_jsonb(a)
      )
      order by rb.created_at
    ),
    '[]'::jsonb
  )
  into v
  from public.genesis_roster_bindings rb
  join public.genesis_athletes a on a.id = rb.athlete_id
  where rb.team_id = p_team_id;

  return v;
end;
$$;

revoke all on function public.genesis_list_team_roster(uuid) from public;
grant execute on function public.genesis_list_team_roster(uuid) to authenticated;
grant execute on function public.genesis_list_team_roster(uuid) to service_role;

commit;
