// /lib/performance/strainRegistry.ts

import {
  initStrainState,
  stepStrainAccumulator,
  defaultStrainAccumulatorConfig,
  StrainAccumulatorState,
  DistributionSample,
} from "./strainAccumulator";

export type DichotomyKey =
  | "training_load_vs_readiness"
  | "individual_vs_team"
  | "consistency_vs_adaptation"
  | "discipline_vs_instinct"
  | "sustainability_vs_pressure";

const registry: Record<DichotomyKey, StrainAccumulatorState> = {
  training_load_vs_readiness: initStrainState(),
  individual_vs_team: initStrainState(),
  consistency_vs_adaptation: initStrainState(),
  discipline_vs_instinct: initStrainState(),
  sustainability_vs_pressure: initStrainState(),
};

export function updateStrain(
  key: DichotomyKey,
  sample: DistributionSample
): StrainAccumulatorState {
  const prev = registry[key];
  const next = stepStrainAccumulator(
    prev,
    sample,
    defaultStrainAccumulatorConfig
  );
  registry[key] = next;
  return next;
}

export function getStrainState(
  key: DichotomyKey
): StrainAccumulatorState {
  return registry[key];
}