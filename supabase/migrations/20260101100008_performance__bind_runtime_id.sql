BEGIN;

DO $$
DECLARE
  g_id uuid;
  t text;
  targets text[] := ARRAY[
    'performance_balance_snapshots',
    'performance_compute_queue',
    'performance_compute_runs',
    'performance_lenses',
    'performance_prime_rulesets',
    'performance_primes',
    'performance_reference_sets',
    'performance_reference_standards',
    'performance_signal_rulesets',
    'performance_signals'
  ];
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

  -- Add runtime_id to all current Performance tables (idempotent)
  FOREACH t IN ARRAY targets LOOP
    EXECUTE format('ALTER TABLE IF EXISTS public.%I ADD COLUMN IF NOT EXISTS runtime_id uuid;', t);

    -- If column exists but nullable, enforce NOT NULL with Genesis default for existing rows
    EXECUTE format('UPDATE public.%I SET runtime_id = COALESCE(runtime_id, %L::uuid);', t, g_id);

    -- Ensure default + not null
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN runtime_id SET DEFAULT %L::uuid;', t, g_id);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN runtime_id SET NOT NULL;', t);
  END LOOP;
END $$;

-- Enforce immutability on UPDATE across all targets (single function reused)
CREATE OR REPLACE FUNCTION public.performance_enforce_runtime_id()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.runtime_id IS NULL THEN
      NEW.runtime_id := (
        SELECT id FROM public.runtimes
        WHERE runtime_type='genesis'
        ORDER BY created_at ASC
        LIMIT 1
      );
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.runtime_id IS DISTINCT FROM OLD.runtime_id THEN
      RAISE EXCEPTION 'runtime_id is immutable on %', TG_TABLE_NAME;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$fn$;

DO $$
DECLARE
  t text;
  trg text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'performance_balance_snapshots',
    'performance_compute_queue',
    'performance_compute_runs',
    'performance_lenses',
    'performance_prime_rulesets',
    'performance_primes',
    'performance_reference_sets',
    'performance_reference_standards',
    'performance_signal_rulesets',
    'performance_signals'
  ] LOOP
    trg := 'trg_' || t || '__runtime_id_guard';

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = trg) THEN
      EXECUTE format(
        'CREATE TRIGGER %I BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.performance_enforce_runtime_id();',
        trg, t
      );
    END IF;
  END LOOP;
END $$;

COMMIT;
