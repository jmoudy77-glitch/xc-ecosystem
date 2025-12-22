-- Performance Module v1 — Ops: Atomic claim for compute queue (SKIP LOCKED)
-- Purpose: concurrency-safe job claiming for compute worker

create or replace function public.performance_claim_next_compute_job(locker text)
returns setof public.performance_compute_queue
language plpgsql
as $$
declare
  v_row public.performance_compute_queue%rowtype;
begin
  select *
    into v_row
  from public.performance_compute_queue
  where status = 'queued'
    and (not_before is null or not_before <= now())
  order by created_at asc
  limit 1
  for update skip locked;

  if not found then
    return;
  end if;

  update public.performance_compute_queue
     set status = 'processing',
         locked_at = now(),
         locked_by = locker,
         attempts = attempts + 1,
         updated_at = now()
   where id = v_row.id
   returning * into v_row;

  return next v_row;
end;
$$;

-- Optional helper: mark done
create or replace function public.performance_mark_compute_job_done(job_id uuid)
returns void
language sql
as $$
  update public.performance_compute_queue
     set status = 'done',
         updated_at = now()
   where id = job_id;
$$;

-- Optional helper: mark failed
create or replace function public.performance_mark_compute_job_failed(job_id uuid, err jsonb)
returns void
language sql
as $$
  update public.performance_compute_queue
     set status = 'failed',
         details_json = coalesce(details_json, '{}'::jsonb) || jsonb_build_object('last_error', err),
         updated_at = now()
   where id = job_id;
$$;