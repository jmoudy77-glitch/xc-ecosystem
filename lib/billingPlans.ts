// lib/billingPlans.ts

export function mapPlanToTier(planCode: PlanCode | string): 
  | "free"
  | "starter"
  | "pro"
  | "elite"
  | "unknown" 
{
  const code = String(planCode).toLowerCase();

  if (
    code === "hs_athlete_basic" ||
    code === "hs_starter" ||
    code === "college_starter"
  ) {
    return "starter";
  }

  if (
    code === "hs_athlete_pro" ||
    code === "hs_pro" ||
    code === "college_pro"
  ) {
    return "pro";
  }

  if (
    code === "hs_athlete_elite" ||
    code === "hs_elite" ||
    code === "college_elite"
  ) {
    return "elite";
  }

  // No subscription or free-tier logic
  if (code === "free" || code === "none" || code === "" || code === "null") {
    return "free";
  }

  return "unknown";
}

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
