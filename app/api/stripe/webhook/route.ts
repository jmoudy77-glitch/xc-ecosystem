// app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// ---- Plan + billing types ----

type BillingScope = "org" | "athlete";

// These are your 9 concrete products, represented as internal codes
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

type BillingStatus = "active" | "past_due" | "canceled" | "trialing" | "none";

// Optional helper if you want to check for “free”
export function isFreePlan(plan: PlanCode | null): boolean {
  return plan === "hs_athlete_basic";
}

// Map Stripe subscription status → internal BillingStatus
function mapStripeStatusToBillingStatus(
  stripeStatus: Stripe.Subscription.Status
): BillingStatus {
  switch (stripeStatus) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
      return "canceled";
    default:
      return "none";
  }
}

// Use subscription.metadata.plan_code when present
function getPlanFromSubscription(subscription: Stripe.Subscription): PlanCode {
  const planCode = subscription.metadata?.plan_code as PlanCode | undefined;

  if (planCode) return planCode;

  // Fallback if metadata is missing/invalid.
  // You *could* inspect subscription.items[].price.product here if needed.
  return "hs_athlete_basic";
}

// ---- Webhook handler ----

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Invalid Stripe signature";
    console.error("Stripe webhook signature verification failed:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (!session.subscription) break;

        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );

        await upsertSubscriptionFromStripe(subscription);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await upsertSubscriptionFromStripe(subscription);
        break;
      }

      default: {
        // Ignore other events for now
        break;
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: unknown) {
    console.error("Error handling Stripe webhook", event.type, err);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

// ---- Core: Stripe Subscription → Supabase organizations/users ----

async function upsertSubscriptionFromStripe(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Metadata set in create-checkout-session (scope, owner_id, plan_code)
  const meta = subscription.metadata ?? {};
  const rawScope = meta.scope as string | undefined;
  const ownerId = meta.owner_id as string | undefined;

  const scope: BillingScope | null =
    rawScope === "org"
      ? "org"
      : rawScope === "athlete"
      ? "athlete"
      : null;

  if (!scope || !ownerId) {
    console.warn(
      "Subscription missing scope/owner_id metadata; skipping",
      subscription.id,
      meta
    );
    return;
  }

  const planCode = getPlanFromSubscription(subscription);
  const status = mapStripeStatusToBillingStatus(subscription.status);

  if (scope === "org") {
    // Organization (coach/program) billing
    const update = {
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      subscription_tier: planCode, // 👈 store concrete PlanCode string
      billing_status: status,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin
      .from("organizations")
      .update(update)
      .eq("id", ownerId);

    if (error) {
      console.error(
        "Failed to update organization billing from Stripe subscription",
        subscription.id,
        error
      );
    }
  } else {
    // Athlete / personal billing (users table)
    const update = {
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      subscription_tier: planCode, // 👈 store concrete PlanCode string
      billing_status: status,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin
      .from("users")
      .update(update)
      .eq("id", ownerId);

    if (error) {
      console.error(
        "Failed to update user billing from Stripe subscription",
        subscription.id,
        error
      );
    }
  }

  // Optional: on cancel, reset to a "free" plan or clear tier
  if (subscription.status === "canceled") {
    if (scope === "org") {
      const { error } = await supabaseAdmin
        .from("organizations")
        .update({
          // For orgs, maybe you want "no paid plan" when canceled:
          subscription_tier: null,
        })
        .eq("id", ownerId);

      if (error) {
        console.error("Failed to reset org tier after cancel", error);
      }
    } else {
      const { error } = await supabaseAdmin
        .from("users")
        .update({
          // For athletes, you might default back to HS Athlete Basic
          subscription_tier: "hs_athlete_basic" as PlanCode,
        })
        .eq("id", ownerId);

      if (error) {
        console.error("Failed to reset user tier after cancel", error);
      }
    }
  }
}



