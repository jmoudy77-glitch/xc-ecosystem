-- R-M3-0011: Activate Recruiting M3 (program-scoped)

BEGIN;

-- ensure runtime flag exists (global default remains inactive)
INSERT INTO system_runtime_flags (runtime_key, is_active, notes)
VALUES ('recruiting_m3', false, 'program-scoped activation (no global default)')
ON CONFLICT (runtime_key) DO NOTHING;

-- ensure program-scoped assignments table exists
CREATE TABLE IF NOT EXISTS system_runtime_flag_assignments (
  runtime_key text not null,
  scope text not null,
  scope_id uuid not null,
  status text not null default 'inactive',
  updated_at timestamptz not null default now(),
  primary key (runtime_key, scope, scope_id)
);

ALTER TABLE system_runtime_flag_assignments ENABLE ROW LEVEL SECURITY;

-- activate for confirmed program
INSERT INTO system_runtime_flag_assignments (runtime_key, scope, scope_id, status)
VALUES (
  'recruiting_m3',
  'program',
  '6252113e-0eb1-482f-8438-50415db05617',
  'active'
)
ON CONFLICT (runtime_key, scope, scope_id)
DO UPDATE SET status = 'active', updated_at = now();

COMMIT;
