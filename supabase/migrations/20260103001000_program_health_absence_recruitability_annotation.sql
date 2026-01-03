-- Annotate Program Health absences with explicit recruitability classification
-- genesis absences are always non-recruitable by definition

create or replace function public.ph_program_health_absence_set_recruitability()
returns trigger
language plpgsql
as $$
begin
  -- ensure details object exists
  new.details := coalesce(new.details, '{}'::jsonb);

  -- default classification
  if new.absence_type = 'genesis' then
    new.details :=
      jsonb_set(
        new.details,
        '{recruitability}',
        to_jsonb('non_recruitable'::text),
        true
      );
  else
    -- leave unset for now; future engines may explicitly mark recruitable
    new.details :=
      jsonb_set(
        new.details,
        '{recruitability}',
        coalesce(new.details->'recruitability', to_jsonb('non_recruitable'::text)),
        true
      );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_ph_absence_set_recruitability
on public.program_health_absences;

create trigger trg_ph_absence_set_recruitability
before insert or update of details, absence_type
on public.program_health_absences
for each row
execute function public.ph_program_health_absence_set_recruitability();
