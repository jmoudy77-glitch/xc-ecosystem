create table if not exists public.recruiting_favorites (
  program_id uuid not null,
  sport text not null default 'xc',
  athlete_id uuid not null,
  position int not null default 0,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (program_id, sport, athlete_id)
);

alter table public.recruiting_favorites enable row level security;

create policy "favorites_read_program_members"
on public.recruiting_favorites
for select
using (
  exists (
    select 1
    from public.program_members pm
    where pm.program_id = recruiting_favorites.program_id
      and pm.user_id = auth.uid()
  )
);

create or replace function public.rpc_recruiting_favorites_upsert_v1(
  p_program_id uuid,
  p_sport text,
  p_athlete_id uuid,
  p_position int default 0,
  p_pinned boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if not exists (
    select 1 from public.program_members
    where program_id = p_program_id
      and user_id = auth.uid()
  ) then
    raise exception 'forbidden';
  end if;

  insert into public.recruiting_favorites (
    program_id, sport, athlete_id, position, pinned
  ) values (
    p_program_id, coalesce(p_sport,'xc'), p_athlete_id, p_position, p_pinned
  )
  on conflict (program_id, sport, athlete_id)
  do update set
    position = excluded.position,
    pinned = excluded.pinned;
end;
$$;

grant execute on function public.rpc_recruiting_favorites_upsert_v1(
  uuid, text, uuid, int, boolean
) to authenticated;
