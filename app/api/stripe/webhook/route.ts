// app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { PlanCode } from "@/lib/billingPlans";

/**
 * Stripe webhook handler.
 *
 * Responsibilities:
 * - Verify Stripe signature
 * - Handle subscription lifecycle events
 * - Upsert rows into:
 *    - program_subscriptions (for scope = "program")
 *    - athlete_subscriptions (for scope = "athlete")
 *
 * This route expects subscriptions to carry metadata:
 *   - scope: "program" | "athlete"
 *   - owner_id: program.id or users.id
 *   - plan_code: PlanCode
 *
 * That metadata is attached by the Checkout Session via subscription_data.metadata
 * in app/billing/create-checkout-session/route.ts.
 */

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

type BillingScope = "program" | "athlete";

function getSubscriptionMetadata(subscription: Stripe.Subscription) {
  const metadata = subscription.metadata || {};
  const scope = metadata.scope as BillingScope | undefined;
  const ownerId = metadata.owner_id as string | undefined;
  const planCode = metadata.plan_code as PlanCode | undefined;

  return { scope, ownerId, planCode };
}

async function upsertSubscriptionFromStripe(
  subscription: Stripe.Subscription,
): Promise<void> {
  const { scope, ownerId, planCode } = getSubscriptionMetadata(subscription);

  if (!scope || !ownerId || !planCode) {
    console.warn(
      "[stripe:webhook] Missing metadata on subscription",
      JSON.stringify({
        subscriptionId: subscription.id,
        scope,
        ownerId,
        planCode,
      }),
    );
    return;
  }

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id || null;

  const status = subscription.status;
  const currentPeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;
  const cancelAtPeriodEnd = subscription.cancel_at_period_end ?? false;

  if (scope === "program") {
    const { error } = await supabaseAdmin
      .from("program_subscriptions")
      .upsert(
        {
          program_id: ownerId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          plan_code: planCode,
          status,
          current_period_end: currentPeriodEnd,
          cancel_at_period_end: cancelAtPeriodEnd,
        },
        {
          onConflict: "program_id,stripe_subscription_id",
        },
      );

    if (error) {
      console.error(
        "[stripe:webhook] Failed to upsert program subscription",
        error,
      );
    }
  } else if (scope === "athlete") {
    const { error } = await supabaseAdmin
      .from("athlete_subscriptions")
      .upsert(
        {
          user_id: ownerId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          plan_code: planCode,
          status,
          current_period_end: currentPeriodEnd,
          cancel_at_period_end: cancelAtPeriodEnd,
        },
        {
          onConflict: "user_id,stripe_subscription_id",
        },
      );

    if (error) {
      console.error(
        "[stripe:webhook] Failed to upsert athlete subscription",
        error,
      );
    }
  }
}

async function markSubscriptionCanceled(
  subscription: Stripe.Subscription,
): Promise<void> {
  const { scope, ownerId, planCode } = getSubscriptionMetadata(subscription);

  if (!scope || !ownerId) {
    console.warn(
      "[stripe:webhook] Missing metadata on canceled subscription",
      JSON.stringify({
        subscriptionId: subscription.id,
        scope,
        ownerId,
        planCode,
      }),
    );
    return;
  }

  if (scope === "program") {
    const { error } = await supabaseAdmin
      .from("program_subscriptions")
      .update({
        status: "canceled",
        cancel_at_period_end: true,
      })
      .match({
        program_id: ownerId,
        stripe_subscription_id: subscription.id,
      });

    if (error) {
      console.error(
        "[stripe:webhook] Failed to mark program subscription canceled",
        error,
      );
    }
  } else if (scope === "athlete") {
    const { error } = await supabaseAdmin
      .from("athlete_subscriptions")
      .update({
        status: "canceled",
        cancel_at_period_end: true,
      })
      .match({
        user_id: ownerId,
        stripe_subscription_id: subscription.id,
      });

    if (error) {
      console.error(
        "[stripe:webhook] Failed to mark athlete subscription canceled",
        error,
      );
    }
  }
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing Stripe signature header" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, WEBHOOK_SECRET);
  } catch (err) {
    console.error("[stripe:webhook] Signature verification failed", err);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await upsertSubscriptionFromStripe(subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await markSubscriptionCanceled(subscription);
        break;
      }
      default: {
        // For now, we ignore other events. You can log them if useful.
        console.log("[stripe:webhook] Unhandled event type:", event.type);
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("[stripe:webhook] Handler error", err);
    return NextResponse.json(
      { error: "Webhook handler error" },
      { status: 500 },
    );
  }
}
