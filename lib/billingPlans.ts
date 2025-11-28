// lib/billingPlans.ts
export type PlanCode =
  | "hs_athlete_basic"
  | "hs_athlete_pro"
  | "hs_athlete_elite"
  | "hs_starter"
  | "hs_pro"
  | "hs_elite"
  | "college_starter"
  | "college_pro"
  | "college_elite";

// Useful helper for gating in the UI
export function isFreePlan(plan: PlanCode | null): boolean {
  return plan === "hs_athlete_basic";
}

// Optional: a coarse "tier" for display logic
export type CoarseTier = "free" | "starter" | "pro" | "elite";

export function getCoarseTier(plan: PlanCode | null): CoarseTier {
  switch (plan) {
    case "hs_athlete_basic":
      return "free";
    case "hs_starter":
    case "college_starter":
      return "starter";
    case "hs_athlete_pro":
    case "hs_pro":
    case "college_pro":
      return "pro";
    case "hs_athlete_elite":
    case "hs_elite":
    case "college_elite":
      return "elite";
    default:
      return "free";
  }
}
