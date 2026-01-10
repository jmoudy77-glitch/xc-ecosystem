-- R-M3-0014: Activation seal (non-mutative)

BEGIN;

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
  'm3_activation_sealed',
  'program',
  '6252113e-0eb1-482f-8438-50415db05617',
  'rpc',
  jsonb_build_object(
    'runtime', 'recruiting_m3',
    'activation_status', 'sealed',
    'program_health_mutation', false
  )
WHERE EXISTS (
  SELECT 1
  FROM programs
  WHERE id = '6252113e-0eb1-482f-8438-50415db05617'
);

COMMIT;
