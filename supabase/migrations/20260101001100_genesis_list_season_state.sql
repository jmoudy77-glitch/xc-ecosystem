begin;

create or replace function public.genesis_get_season_state(
  p_season_id uuid
) returns jsonb
language plpgsql
as $$
declare
  v jsonb;
begin
  select jsonb_build_object(
    'season', to_jsonb(s),
    'pipelines', coalesce((select jsonb_agg(to_jsonb(p) order by p.pipeline_key) from public.genesis_season_pipelines p where p.season_id = s.id), '[]'::jsonb),
    'governance_planes', coalesce((select jsonb_agg(to_jsonb(g) order by g.plane_key) from public.genesis_season_governance_planes g where g.season_id = s.id), '[]'::jsonb),
    'lifecycle_hooks', coalesce((select jsonb_agg(to_jsonb(h) order by h.hook_key) from public.genesis_season_lifecycle_hooks h where h.season_id = s.id), '[]'::jsonb),
    'surfaces', coalesce((select jsonb_agg(to_jsonb(sf) order by sf.surface_key) from public.genesis_season_surfaces sf where sf.season_id = s.id), '[]'::jsonb),
    'runtime_planes', coalesce((select jsonb_agg(to_jsonb(rp) order by rp.plane_key) from public.genesis_runtime_planes rp where rp.season_id = s.id), '[]'::jsonb),
    'automation_laws', coalesce((select jsonb_agg(to_jsonb(al) order by al.law_key) from public.genesis_automation_laws al where al.season_id = s.id), '[]'::jsonb)
  )
  into v
  from public.genesis_seasons s
  where s.id = p_season_id;

  if v is null then
    raise exception 'season not found';
  end if;

  return v;
end;
$$;

revoke all on function public.genesis_get_season_state(uuid) from public;
grant execute on function public.genesis_get_season_state(uuid) to authenticated;
grant execute on function public.genesis_get_season_state(uuid) to service_role;

commit;
