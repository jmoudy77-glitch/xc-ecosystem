-- PROMOTION 20
-- Derived read model retention helper.
-- Canonical events + recruiting_ledger remain the immutable audit source of truth.
-- recruiting_snapshots is a derived convenience table; we may prune old rows safely.

-- Add a retention marker column (for future ops visibility) - optional
alter table public.recruiting_snapshots
  add column if not exists retained_until timestamptz;

-- Default: retain 365 days from creation (adjust later)
update public.recruiting_snapshots
set retained_until = created_at + interval '365 days'
where retained_until is null;

-- Pruning helper (SECURITY DEFINER) - callable by service role only.
create or replace function public.prune_recruiting_snapshots(p_cutoff timestamptz)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from public.recruiting_snapshots
  where created_at < p_cutoff;

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.prune_recruiting_snapshots(timestamptz) from public;
grant execute on function public.prune_recruiting_snapshots(timestamptz) to service_role;

