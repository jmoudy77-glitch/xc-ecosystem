-- rpc_auth_uid: prove PostgREST auth context (auth.uid) from server actions
create or replace function public.rpc_auth_uid()
returns uuid
language sql
stable
as $$
  select auth.uid();
$$;

grant execute on function public.rpc_auth_uid() to anon;
grant execute on function public.rpc_auth_uid() to authenticated;
