-- 2025-12-12 Identity Keys + Duplicate Detection (DB-outward)
-- NOTE: Idempotent where practical. Review in staging before prod.

begin;

-- 0) Extensions
create extension if not exists pgcrypto;

-- 1) Canonical identity functions
create or replace function public.identity_normalize_name(input text)
returns text
language sql
immutable
as $$
  select lower(
    regexp_replace(
      coalesce(trim(input), ''),
      '[^a-z0-9]+',
      '',
      'g'
    )
  );
$$;

create or replace function public.identity_sha256_hex(input text)
returns text
language sql
immutable
as $$
  select encode(digest(coalesce(input, ''), 'sha256'), 'hex');
$$;

create or replace function public.athlete_identity_key_weak(
  first_name text,
  last_name text,
  grad_year integer
)
returns text
language sql
immutable
as $$
  select public.identity_sha256_hex(
    public.identity_normalize_name(first_name)
    || '|' ||
    public.identity_normalize_name(last_name)
    || '|' ||
    coalesce(grad_year::text, '')
  );
$$;

create or replace function public.athlete_identity_key_strong(
  first_name text,
  last_name text,
  date_of_birth date
)
returns text
language sql
immutable
as $$
  select case
    when date_of_birth is null then null
    else public.identity_sha256_hex(
      public.identity_normalize_name(first_name)
      || '|' ||
      public.identity_normalize_name(last_name)
      || '|' ||
      to_char(date_of_birth, 'YYYY-MM-DD')
    )
  end;
$$;

-- 2) Athlete columns
alter table public.athletes
  add column if not exists identity_key_weak text,
  add column if not exists identity_key_strong text,
  add column if not exists identity_confidence text not null default 'weak',
  add column if not exists needs_identity_review boolean not null default false,
  add column if not exists date_of_birth date;

-- 3) Confidence constraint
alter table public.athletes
  drop constraint if exists athletes_identity_confidence_check;

alter table public.athletes
  add constraint athletes_identity_confidence_check
  check (identity_confidence in ('weak', 'strong', 'claimed'));

-- 4) Indexes
create index if not exists athletes_identity_key_weak_idx
  on public.athletes(identity_key_weak);

-- Strong key canonical uniqueness (only when present)
do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'athletes_identity_key_strong_unique'
  ) then
    execute 'create unique index athletes_identity_key_strong_unique
             on public.athletes(identity_key_strong)
             where identity_key_strong is not null';
  end if;
end $$;

-- 5) Audit table (credibility insurance)
create table if not exists public.athlete_identity_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('created', 'updated', 'duplicate_detected', 'claimed', 'merged')),
  canonical_athlete_id uuid,
  source_athlete_id uuid,
  program_id uuid,
  actor_user_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint athlete_identity_events_canonical_fkey foreign key (canonical_athlete_id) references public.athletes(id),
  constraint athlete_identity_events_source_fkey foreign key (source_athlete_id) references public.athletes(id),
  constraint athlete_identity_events_program_fkey foreign key (program_id) references public.programs(id),
  constraint athlete_identity_events_actor_fkey foreign key (actor_user_id) references public.users(id)
);

create index if not exists athlete_identity_events_canonical_idx
  on public.athlete_identity_events(canonical_athlete_id);

create index if not exists athlete_identity_events_source_idx
  on public.athlete_identity_events(source_athlete_id);

-- 6) Trigger to keep keys in sync (DB outward)
create or replace function public.athletes_set_identity_keys_trg()
returns trigger
language plpgsql
as $$
begin
  -- Always maintain weak identity (coach-friendly)
  new.identity_key_weak :=
    public.athlete_identity_key_weak(new.first_name, new.last_name, new.grad_year);

  -- Strong identity: compute when DOB exists (unique index will enforce canonical uniqueness)
  new.identity_key_strong :=
    public.athlete_identity_key_strong(new.first_name, new.last_name, new.date_of_birth);

  -- Confidence sync (app may set explicitly; this keeps sane defaults)
  if new.date_of_birth is not null and (new.identity_confidence = 'weak') then
    new.identity_confidence := 'strong';
  end if;

  if new.user_id is not null then
    new.identity_confidence := 'claimed';
  end if;

  return new;
end;
$$;

drop trigger if exists athletes_set_identity_keys on public.athletes;

create trigger athletes_set_identity_keys
before insert or update of first_name, last_name, grad_year, date_of_birth, user_id
on public.athletes
for each row
execute function public.athletes_set_identity_keys_trg();

-- 7) Backfill weak keys (safe, no merges)
update public.athletes a
set identity_key_weak = public.athlete_identity_key_weak(a.first_name, a.last_name, a.grad_year)
where a.identity_key_weak is null;

-- 8) Collision precheck helper
create or replace function public.find_athlete_by_strong_identity(
  first_name text,
  last_name text,
  date_of_birth date,
  exclude_athlete_id uuid default null
)
returns uuid
language sql
stable
as $$
  select a.id
  from public.athletes a
  where a.identity_key_strong = public.athlete_identity_key_strong(first_name, last_name, date_of_birth)
    and (exclude_athlete_id is null or a.id <> exclude_athlete_id)
  limit 1;
$$;

-- 9) RPC: set DOB and upgrade, with explicit collision signal
create or replace function public.athlete_set_dob_and_upgrade_identity(
  p_athlete_id uuid,
  p_date_of_birth date,
  p_actor_user_id uuid default null,
  p_program_id uuid default null
)
returns jsonb
language plpgsql
as $$
declare
  v_athlete public.athletes%rowtype;
  v_conflict_id uuid;
begin
  select * into v_athlete
  from public.athletes
  where id = p_athlete_id;

  if not found then
    raise exception 'athlete_not_found';
  end if;

  v_conflict_id := public.find_athlete_by_strong_identity(
    v_athlete.first_name,
    v_athlete.last_name,
    p_date_of_birth,
    p_athlete_id
  );

  if v_conflict_id is not null then
    insert into public.athlete_identity_events(
      event_type, canonical_athlete_id, source_athlete_id, program_id, actor_user_id, details
    ) values (
      'duplicate_detected',
      v_conflict_id,
      p_athlete_id,
      p_program_id,
      p_actor_user_id,
      jsonb_build_object(
        'reason', 'strong_identity_collision',
        'conflict_athlete_id', v_conflict_id
      )
    );

    raise exception 'strong_identity_collision:%', v_conflict_id;
  end if;

  update public.athletes
  set date_of_birth = p_date_of_birth,
      needs_identity_review = false
  where id = p_athlete_id;

  insert into public.athlete_identity_events(
    event_type, canonical_athlete_id, source_athlete_id, program_id, actor_user_id, details
  ) values (
    'updated',
    p_athlete_id,
    p_athlete_id,
    p_program_id,
    p_actor_user_id,
    jsonb_build_object('updated_fields', array['date_of_birth'])
  );

  return jsonb_build_object(
    'ok', true,
    'athlete_id', p_athlete_id
  );
end;
$$;

commit;
