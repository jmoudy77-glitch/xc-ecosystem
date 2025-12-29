-- XC-Ecosystem Sovereign Runtime
-- Promotion 59: Backfill canonical citizens into public.users from auth.users (safe + explicit)

begin;

-- 1) Detect whether public.users has required NOT NULL columns without defaults (besides id).
-- If it does, we fail with an explicit message rather than silently inserting invalid rows.
do $$
declare
  v_problem_cols text;
begin
  select string_agg(c.column_name, ', ' order by c.ordinal_position)
    into v_problem_cols
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'users'
    and c.is_nullable = 'NO'
    and c.column_default is null
    and c.column_name <> 'id'
    and c.column_name <> 'email';

  if v_problem_cols is not null then
    raise exception
      'public.users requires NOT NULL columns without defaults: %. Backfill cannot proceed safely. Add defaults or provide a specialized minting insert for these columns.',
      v_problem_cols;
  end if;
end
$$;

-- 2) Backfill missing user ids; include email only if the column exists.
do $$
declare
  v_has_email boolean := false;
begin
  select exists (
    select 1
    from information_schema.columns
    where table_schema='public' and table_name='users' and column_name='email'
  ) into v_has_email;

  if v_has_email then
    execute $sql$
      insert into public.users (id, email)
      select au.id, au.email
      from auth.users au
      left join public.users u on u.id = au.id
      where u.id is null
    $sql$;
  else
    execute $sql$
      insert into public.users (id)
      select au.id
      from auth.users au
      left join public.users u on u.id = au.id
      where u.id is null
    $sql$;
  end if;
end
$$;

commit;
