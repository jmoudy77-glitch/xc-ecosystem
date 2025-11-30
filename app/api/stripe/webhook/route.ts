// app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { PlanCode } from "@/lib/billingPlans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

type BillingScope = "org" | "athlete" | "program";

// Map planCode → Stripe price ID via env vars
const PRICE_BY_PLAN: Record<PlanCode, string> = {
  hs_athlete_basic: process.env.STRIPE_PRICE_HS_ATHLETE_BASIC || "",
  hs_athlete_pro: process.env.STRIPE_PRICE_HS_ATHLETE_PRO || "",
  hs_athlete_elite: process.env.STRIPE_PRICE_HS_ATHLETE_ELITE || "",
  hs_starter: process.env.STRIPE_PRICE_HS_STARTER || "",
  hs_pro: process.env.STRIPE_PRICE_HS_PRO || "",
  hs_elite: process.env.STRIPE_PRICE_HS_ELITE || "",
  college_starter: process.env.STRIPE_PRICE_COLLEGE_STARTER || "",
  college_pro: process.env.STRIPE_PRICE_COLLEGE_PRO || "",
  college_elite: process.env.STRIPE_PRICE_COLLEGE_ELITE || "",
};

function getPlanCodeFromPriceId(priceId: string | null | undefined): PlanCode | null {
  if (!priceId) return null;
  const entries = Object.entries(PRICE_BY_PLAN) as [PlanCode, string][];
  for (const [code, envPriceId] of entries) {
    if (envPriceId && envPriceId === priceId) {
      return code;
    }
  }
  return null;
}

function getScopeAndOwnerFromSubscription(
  sub: Stripe.Subscription,
): { scope: BillingScope; ownerId: string; planCode: PlanCode | null } | null {
  const metadata = sub.metadata || {};
  const scope = metadata.scope as BillingScope | undefined;
  const ownerId = metadata.ownerId as string | undefined;
  let planCode = (metadata.planCode as PlanCode | undefined) || null;

  if (!scope || !ownerId) {
    console.warn("[stripe webhook] Missing scope/ownerId metadata on subscription:", sub.id);
    return null;
  }

  // Try to infer planCode from price if not present in metadata
  if (!planCode) {
    const item = sub.items.data[0];
    const priceId = item?.price?.id;
    planCode = getPlanCodeFromPriceId(priceId);
  }

  return { scope, ownerId, planCode };
}

async function upsertSubscription(sub: Stripe.Subscription) {
  const parsed = getScopeAndOwnerFromSubscription(sub);
  if (!parsed) return;

  const { scope, ownerId, planCode } = parsed;

  // Determine table + owner column by scope
  let tableName: string;
  let ownerColumn: string;

  if (scope === "program") {
    tableName = "program_subscriptions";
    ownerColumn = "program_id";
  } else if (scope === "athlete") {
    tableName = "athlete_subscriptions";
    ownerColumn = "user_id"; // adjust if your schema uses athlete_id instead
  } else {
    tableName = "org_subscriptions";
    ownerColumn = "org_id";
  }

  const stripeCustomerId =
    typeof sub.customer === "string" ? sub.customer : (sub.customer as Stripe.Customer | null)?.id ?? null;

  // Use a loose type cast here to avoid TS complaints across Stripe versions
  const rawCurrentPeriodEnd = (sub as any).current_period_end as number | null | undefined;
  const currentPeriodEnd = rawCurrentPeriodEnd
    ? new Date(rawCurrentPeriodEnd * 1000).toISOString()
    : null;

  const payload: Record<string, any> = {
    [ownerColumn]: ownerId,
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: sub.id,
    status: sub.status,
    current_period_end: currentPeriodEnd,
  };

  if (planCode) {
    payload.plan_code = planCode;
  }

  const { error } = await supabaseAdmin
    .from(tableName)
    .upsert(payload, { onConflict: "stripe_subscription_id" });

  if (error) {
    console.error("[stripe webhook] Failed to upsert subscription:", {
      tableName,
      ownerColumn,
      ownerId,
      error,
    });
  }
}

async function markSubscriptionCanceled(sub: Stripe.Subscription) {
  const parsed = getScopeAndOwnerFromSubscription(sub);
  if (!parsed) return;

  const { scope } = parsed;

  let tableName: string;

  if (scope === "program") {
    tableName = "program_subscriptions";
  } else if (scope === "athlete") {
    tableName = "athlete_subscriptions";
  } else {
    tableName = "org_subscriptions";
  }

  const { error } = await supabaseAdmin
    .from(tableName)
    .update({ status: "canceled" })
    .eq("stripe_subscription_id", sub.id);

  if (error) {
    console.error("[stripe webhook] Failed to mark subscription canceled:", {
      tableName,
      subscriptionId: sub.id,
      error,
    });
  }
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json(
      { error: "Missing Stripe signature header" },
      { status: 400 },
    );
  }

  const rawBody = await req.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error("[stripe webhook] Signature verification failed:", err);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message ?? "invalid signature"}` },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await upsertSubscription(subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await markSubscriptionCanceled(subscription);
        break;
      }
      default:
        // console.log("[stripe webhook] Unhandled event type:", event.type);
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    console.error("[stripe webhook] Handler error:", err);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 },
    );
  }
}
