create or replace function public.ops_set_workflow_action_enabled(p_key text, p_enabled boolean)
returns table (key text, is_enabled boolean)
language plpgsql
as $$
begin
  update public.operational_workflow_actions
  set is_enabled = p_enabled
  where key = lower(p_key)
  returning key, is_enabled;
end;
$$;
