// lib/billing.ts

export type BillingStatus = "active" | "inactive" | "past_due" | null;
export type SubscriptionTier = "starter" | "pro" | "elite" | null;

export function orgHasActiveSubscription(
  status: BillingStatus | undefined,
) {
  return status === "active";
}

export function orgHasAiFeatures(
  tier: SubscriptionTier | undefined
) {
  return tier === "elite";
}
