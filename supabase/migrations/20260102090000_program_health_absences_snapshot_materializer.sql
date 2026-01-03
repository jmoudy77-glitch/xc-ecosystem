-- Program Health — Option 1 Enforcement
-- Guarantee snapshot emission for every (program_id, scope_id, sport, horizon) key that has absences,
-- by materializing program_health_snapshots from program_health_absences via trigger.

create or replace function public.ph_materialize_snapshot_from_absences(
  p_program_id uuid,
  p_scope_id uuid,
  p_sport text,
  p_horizon text
) returns void
language plpgsql
as $$
declare
  v_absences jsonb := '[]'::jsonb;
  v_cnt int := 0;
  v_latest_canonical_event_id uuid;
  v_latest_ledger_id uuid;
  v_inputs_hash text := 'ph_absences_trigger_v1';
  v_summary jsonb;
  v_full_payload jsonb;
begin
  with rows as (
    select a.*
    from public.program_health_absences a
    where a.program_id = p_program_id
      and a.sport = p_sport
      and a.horizon = p_horizon
      and a.scope_id is not distinct from p_scope_id
    order by a.created_at desc
  )
  select
    count(*)::int,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'absence_key', r.absence_key,
          'absence_type', r.absence_type,
          'severity', r.severity,
          'details', r.details,
          'capability_node_id', r.capability_node_id,
          'canonical_event_id', r.canonical_event_id,
          'ledger_id', r.ledger_id,
          'created_at', r.created_at,
          'notes', r.notes,
          'scope_id', r.scope_id,
          'sport', r.sport,
          'horizon', r.horizon
        )
        order by r.created_at desc
      ),
      '[]'::jsonb
    ),
    (select canonical_event_id from rows limit 1),
    (select ledger_id from rows limit 1)
  into
    v_cnt,
    v_absences,
    v_latest_canonical_event_id,
    v_latest_ledger_id
  from rows r;

  v_summary := jsonb_build_object('absences_total', v_cnt);
  v_full_payload := jsonb_build_object('summary', v_summary, 'absences', v_absences);

  delete from public.program_health_snapshots s
  where s.program_id = p_program_id
    and s.sport = p_sport
    and s.horizon = p_horizon
    and s.scope_id is not distinct from p_scope_id;

  if v_cnt > 0 then
    insert into public.program_health_snapshots (
      program_id,
      scope_id,
      sport,
      horizon,
      canonical_event_id,
      ledger_id,
      inputs_hash,
      summary,
      full_payload
    ) values (
      p_program_id,
      p_scope_id,
      p_sport,
      p_horizon,
      v_latest_canonical_event_id,
      v_latest_ledger_id,
      v_inputs_hash,
      v_summary,
      v_full_payload
    );
  end if;
end;
$$;

create or replace function public.ph_absences_snapshot_trigger()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'DELETE') then
    perform public.ph_materialize_snapshot_from_absences(
      old.program_id,
      old.scope_id,
      old.sport,
      old.horizon
    );
    return old;
  else
    perform public.ph_materialize_snapshot_from_absences(
      new.program_id,
      new.scope_id,
      new.sport,
      new.horizon
    );
    return new;
  end if;
end;
$$;

drop trigger if exists trg_ph_absences_materialize_snapshot on public.program_health_absences;

create trigger trg_ph_absences_materialize_snapshot
after insert or update or delete
on public.program_health_absences
for each row
execute function public.ph_absences_snapshot_trigger();
