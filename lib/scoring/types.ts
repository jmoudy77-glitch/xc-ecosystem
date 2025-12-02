export type GlobalComponentScores = {
  academic: number; // 0-100
  performance: number; // 0-100
  availability: number; // 0-100
  conduct: number; // 0-100
};

export type GlobalScoreResult = GlobalComponentScores & {
  global_overall: number; // 0-100
};

export type ProgramWeights = {
  academic: number;
  performance: number;
  availability: number;
  conduct: number;
};

export type ProgramScoreResult = {
  overall_for_program: number;
  fit_score_for_program: number | null;
};
