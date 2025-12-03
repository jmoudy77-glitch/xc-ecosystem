// lib/accessControl.ts
//
// Central helpers for checking what features a subscription should unlock.
// This keeps "what plans can do what" in one place instead of sprinkling
// string checks all over the app.

import type { PlanCode } from "./billingPlans";
import { mapPlanToTier } from "./billingPlans";

export type BillingStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "unknown"
  | string; // tolerate unknowns from DB

export type AthleteBillingLite = {
  planCode: PlanCode | string | null;
  status: BillingStatus | null;
};

export type ProgramBillingLite = {
  planCode: PlanCode | string | null;
  status: BillingStatus | null;
};

// ---------- Base utilities ----------

export function isSubscriptionActive(status: BillingStatus | null | undefined) {
  if (!status) return false;
  const s = String(status).toLowerCase();
  return s === "active" || s === "trialing" || s === "past_due";
}

export function getPlanTier(planCode: PlanCode | string | null | undefined):
  | "free"
  | "starter"
  | "pro"
  | "elite"
  | "unknown" {
  if (!planCode) return "unknown";

  try {
    // mapPlanToTier is already defined in billingPlans.ts
    return mapPlanToTier(planCode as PlanCode);
  } catch {
    return "unknown";
  }
}

// ---------- Athlete feature checks ----------

export function hasPaidAthletePlan(
  billing: AthleteBillingLite | null | undefined
): boolean {
  if (!billing) return false;
  if (!isSubscriptionActive(billing.status)) return false;
  const tier = getPlanTier(billing.planCode);
  return tier === "starter" || tier === "pro" || tier === "elite";
}

export function canUseAthleteAI(
  billing: AthleteBillingLite | null | undefined
): boolean {
  if (!billing) return false;
  if (!isSubscriptionActive(billing.status)) return false;
  const tier = getPlanTier(billing.planCode);
  // e.g., require Pro or Elite for AI features
  return tier === "pro" || tier === "elite";
}

// ---------- Program feature checks ----------

export function hasPaidProgramPlan(
  billing: ProgramBillingLite | null | undefined
): boolean {
  if (!billing) return false;
  if (!isSubscriptionActive(billing.status)) return false;
  const tier = getPlanTier(billing.planCode);
  return tier === "starter" || tier === "pro" || tier === "elite";
}

export function canUseProgramRecruiting(
  billing: ProgramBillingLite | null | undefined
): boolean {
  if (!billing) return false;
  if (!isSubscriptionActive(billing.status)) return false;
  const tier = getPlanTier(billing.planCode);
  // Example rule: recruiting tools require at least Starter
  return tier === "starter" || tier === "pro" || tier === "elite";
}

export function canUseProgramAI(
  billing: ProgramBillingLite | null | undefined
): boolean {
  if (!billing) return false;
  if (!isSubscriptionActive(billing.status)) return false;
  const tier = getPlanTier(billing.planCode);
  // Example rule: AI tools require Pro or Elite
  return tier === "pro" || tier === "elite";
}