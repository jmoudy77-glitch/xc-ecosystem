-- R-M3-0013: Positive-path evidence run (guarded)

BEGIN;

DO $$
DECLARE
  recruitable_count integer;
BEGIN
  SELECT COUNT(*)
  INTO recruitable_count
  FROM program_health_absences
  WHERE program_id = '6252113e-0eb1-482f-8438-50415db05617'
    AND details->>'recruitability' = 'recruitable';

  IF recruitable_count > 0 THEN
    INSERT INTO canonical_events (
      program_id,
      event_domain,
      event_type,
      scope_type,
      scope_id,
      source_system,
      payload
    )
    SELECT
      '6252113e-0eb1-482f-8438-50415db05617',
      'recruiting',
      'm3_positive_path_evidence',
      'program',
      '6252113e-0eb1-482f-8438-50415db05617',
      'rpc',
      jsonb_build_object(
        'runtime', 'recruiting_m3',
        'evidence_type', 'positive_path',
        'recruitable_absence_count', recruitable_count,
        'program_health_mutation', false
      )
    WHERE EXISTS (
      SELECT 1
      FROM programs
      WHERE id = '6252113e-0eb1-482f-8438-50415db05617'
    );
  END IF;
END $$;

COMMIT;
