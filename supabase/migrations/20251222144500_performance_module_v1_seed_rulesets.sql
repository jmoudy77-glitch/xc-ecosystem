-- Performance Module v1 (Intel-Prime) — Seed: Rulesets
-- File: supabase/migrations/20251222_performance_module_v1_seed_rulesets.sql
--
-- Purpose:
--   Seed canonical, system-owned rulesets for deterministic primes and signals.
--   This keeps table creation separate from operational defaults.
--
-- Contract alignment:
--   - Math is explicit, deterministic, and versioned.
--   - AI may read outputs, but does not write primes/signals.
--   - Specs are stored as JSON for auditability and future evolution without refactors.

--------------------------------------------------------------------------------
-- Seed: Prime ruleset (performance_prime_v1)
--------------------------------------------------------------------------------

insert into public.performance_prime_rulesets (ruleset_code, formula_spec_json, is_active)
values (
  'performance_prime_v1',
  '{
    "version": "v1",
    "name": "Performance Prime",
    "deterministic": true,
    "notes": "Canonical v1 placeholder spec. Populate with explicit formulas and mappings before enabling compute jobs.",
    "inputs": {
      "required": ["athlete_performances.id", "athlete_performances.athlete_id", "athlete_performances.event_code"],
      "optional": [
        "athlete_performances.mark_seconds",
        "athlete_performances.mark_value",
        "athlete_performances.performance_date",
        "athlete_performances.performance_type",
        "athlete_performances.timing_method",
        "athlete_performances.location",
        "athlete_performances.meet_name"
      ]
    },
    "event_normalization": {
      "canonical_event_code_source": "event_definitions.event_code",
      "mappings": []
    },
    "index_formula": {
      "description": "Explicit formula to be defined (math-first).",
      "expression": null
    },
    "fingerprinting": {
      "method": "sha256",
      "fields": [
        "athlete_id",
        "event_code",
        "mark_seconds",
        "mark_value",
        "performance_date",
        "performance_type",
        "timing_method"
      ]
    }
  }'::jsonb,
  true
)
on conflict (ruleset_code) do update
set formula_spec_json = excluded.formula_spec_json,
    is_active = excluded.is_active;

--------------------------------------------------------------------------------
-- Seed: Signal ruleset (signals_v1)
--------------------------------------------------------------------------------

insert into public.performance_signal_rulesets (ruleset_code, rules_json, is_active)
values (
  'signals_v1',
  '{
    "version": "v1",
    "name": "Performance Signals",
    "deterministic": true,
    "notes": "Canonical v1 placeholder thresholds. Rules are system-owned and must remain explainable.",
    "signals": [
      {
        "signal_code": "plateau_detected",
        "applies_to": ["athlete"],
        "severity_scale": "1-5 calm",
        "description": "Trend slope is near-zero over the active lens window with sufficient sample size.",
        "thresholds": {
          "min_samples": 5,
          "abs_slope_max": 0.02,
          "min_confidence": 0.6
        }
      },
      {
        "signal_code": "volatility_shift",
        "applies_to": ["athlete","team_season","team_window"],
        "severity_scale": "1-5 calm",
        "description": "Volatility exceeds historical baseline by a bounded factor.",
        "thresholds": {
          "baseline_window": "rolling",
          "baseline_years": 2,
          "multiplier": 1.5,
          "min_samples": 5
        }
      },
      {
        "signal_code": "breakout_indicator",
        "applies_to": ["athlete"],
        "severity_scale": "1-5 calm",
        "description": "Sustained improvement above threshold with acceptable volatility.",
        "thresholds": {
          "min_samples": 3,
          "slope_min": 0.08,
          "volatility_max": 0.35,
          "min_confidence": 0.6
        }
      }
    ]
  }'::jsonb,
  true
)
on conflict (ruleset_code) do update
set rules_json = excluded.rules_json,
    is_active = excluded.is_active;
