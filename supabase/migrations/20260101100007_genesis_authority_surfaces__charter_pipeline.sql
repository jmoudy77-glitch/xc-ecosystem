BEGIN;

DO $$
DECLARE
  g_id uuid;
  ev_id uuid;
  v_system_principal uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  v_missing boolean := false;
BEGIN
  -- Resolve Genesis runtime deterministically
  SELECT id INTO g_id
  FROM public.runtimes
  WHERE runtime_type = 'genesis'
  ORDER BY created_at ASC
  LIMIT 1;

  IF g_id IS NULL THEN
    RAISE EXCEPTION 'Genesis runtime not found (runtime_type=genesis).';
  END IF;

  -- Check if any charter pipeline surface is missing
  IF NOT EXISTS (
    SELECT 1
    FROM public.runtime_authority_surfaces
    WHERE runtime_id = g_id
      AND authority_class = 'runtime.charter.submit'
      AND principal_id = v_system_principal
    LIMIT 1
  ) OR NOT EXISTS (
    SELECT 1
    FROM public.runtime_authority_surfaces
    WHERE runtime_id = g_id
      AND authority_class = 'runtime.charter.accept'
      AND principal_id = v_system_principal
    LIMIT 1
  ) OR NOT EXISTS (
    SELECT 1
    FROM public.runtime_authority_surfaces
    WHERE runtime_id = g_id
      AND authority_class = 'runtime.forge.execute'
      AND principal_id = v_system_principal
    LIMIT 1
  ) OR NOT EXISTS (
    SELECT 1
    FROM public.runtime_authority_surfaces
    WHERE runtime_id = g_id
      AND authority_class = 'runtime.seal.execute'
      AND principal_id = v_system_principal
    LIMIT 1
  ) THEN
    v_missing := true;
  END IF;

  IF v_missing THEN
    -- Create install event (allowlisted type) with chain-safe helpers
    ev_id := public.runtime_emit_event(
      g_id,
      NULL,
      NULL,
      'system',
      v_system_principal,
      'runtime',
      g_id,
      'runtime.authority.install',
      jsonb_build_object(
        'note', 'Install charter pipeline authority surfaces (submit/accept/forge/seal)',
        'authority_classes', jsonb_build_array(
          'runtime.charter.submit',
          'runtime.charter.accept',
          'runtime.forge.execute',
          'runtime.seal.execute'
        )
      )
    );

    -- Install surfaces (idempotent)
    INSERT INTO public.runtime_authority_surfaces (
      runtime_id,
      authority_class,
      principal_id,
      scope,
      permissions,
      status,
      installed_by_event_id
    )
    SELECT
      g_id,
      'runtime.charter.submit',
      v_system_principal,
      jsonb_build_object('scope', 'runtime'),
      jsonb_build_object('allow', ARRAY['write','append','commit']),
      'active',
      ev_id
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.runtime_authority_surfaces
      WHERE runtime_id = g_id
        AND authority_class = 'runtime.charter.submit'
        AND principal_id = v_system_principal
      LIMIT 1
    );

    INSERT INTO public.runtime_authority_surfaces (
      runtime_id,
      authority_class,
      principal_id,
      scope,
      permissions,
      status,
      installed_by_event_id
    )
    SELECT
      g_id,
      'runtime.charter.accept',
      v_system_principal,
      jsonb_build_object('scope', 'runtime'),
      jsonb_build_object('allow', ARRAY['write','append','commit']),
      'active',
      ev_id
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.runtime_authority_surfaces
      WHERE runtime_id = g_id
        AND authority_class = 'runtime.charter.accept'
        AND principal_id = v_system_principal
      LIMIT 1
    );

    INSERT INTO public.runtime_authority_surfaces (
      runtime_id,
      authority_class,
      principal_id,
      scope,
      permissions,
      status,
      installed_by_event_id
    )
    SELECT
      g_id,
      'runtime.forge.execute',
      v_system_principal,
      jsonb_build_object('scope', 'runtime'),
      jsonb_build_object('allow', ARRAY['write','append','commit']),
      'active',
      ev_id
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.runtime_authority_surfaces
      WHERE runtime_id = g_id
        AND authority_class = 'runtime.forge.execute'
        AND principal_id = v_system_principal
      LIMIT 1
    );

    INSERT INTO public.runtime_authority_surfaces (
      runtime_id,
      authority_class,
      principal_id,
      scope,
      permissions,
      status,
      installed_by_event_id
    )
    SELECT
      g_id,
      'runtime.seal.execute',
      v_system_principal,
      jsonb_build_object('scope', 'runtime'),
      jsonb_build_object('allow', ARRAY['write','append','commit']),
      'active',
      ev_id
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.runtime_authority_surfaces
      WHERE runtime_id = g_id
        AND authority_class = 'runtime.seal.execute'
        AND principal_id = v_system_principal
      LIMIT 1
    );
  END IF;
END $$;

COMMIT;
