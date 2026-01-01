begin;

create or replace function public.genesis_list_program_seasons(
  p_program_id uuid
) returns jsonb
language plpgsql
as $$
declare
  v jsonb;
begin
  select coalesce(
    jsonb_agg(to_jsonb(s) order by s.window_start desc),
    '[]'::jsonb
  )
  into v
  from public.genesis_seasons s
  where s.program_id = p_program_id;

  return v;
end;
$$;

revoke all on function public.genesis_list_program_seasons(uuid) from public;
grant execute on function public.genesis_list_program_seasons(uuid) to authenticated;
grant execute on function public.genesis_list_program_seasons(uuid) to service_role;

commit;
