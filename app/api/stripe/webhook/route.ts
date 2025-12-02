// app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

// Helper to upsert into the correct subscriptions table based on scope
type BillingScope = "org" | "athlete";

async function upsertSubscriptionRecord(args: {
  scope: BillingScope;
  ownerId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  planCode: string | null;
  status: string;
  currentPeriodEnd: number | null; // unix seconds
}) {
  const {
    scope,
    ownerId,
    stripeCustomerId,
    stripeSubscriptionId,
    planCode,
    status,
    currentPeriodEnd,
  } = args;

  // IMPORTANT: We no longer use org_subscriptions.
  // For org (program-level) billing we write to program_subscriptions using program_id.
  let tableName: string;
  let ownerColumn: string;

  if (scope === "org") {
    tableName = "program_subscriptions";
    ownerColumn = "program_id";
  } else {
    // keep athlete scope for completeness if/when you add athlete_subscriptions
    tableName = "athlete_subscriptions";
    ownerColumn = "athlete_id";
  }

  const currentPeriodEndIso =
    currentPeriodEnd != null ? new Date(currentPeriodEnd * 1000).toISOString() : null;

  const payload: Record<string, any> = {
    [ownerColumn]: ownerId,
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: stripeSubscriptionId,
    plan_code: planCode,
    status,
    current_period_end: currentPeriodEndIso,
  };

  const { error } = await supabaseAdmin
    .from(tableName)
    .upsert(payload, {
      onConflict: ownerColumn, // requires unique constraint on program_id / athlete_id
    });

  if (error) {
    console.error("[stripe webhook] Failed to upsert subscription:", {
      tableName,
      ownerColumn,
      ownerId,
      error,
    });
    throw error;
  }
}

async function markSubscriptionCanceled(args: {
  scope: BillingScope;
  ownerId: string;
  stripeSubscriptionId: string;
}) {
  const { scope, ownerId, stripeSubscriptionId } = args;

  let tableName: string;
  let ownerColumn: string;

  if (scope === "org") {
    tableName = "program_subscriptions";
    ownerColumn = "program_id";
  } else {
    tableName = "athlete_subscriptions";
    ownerColumn = "athlete_id";
  }

  const { error } = await supabaseAdmin
    .from(tableName)
    .update({
      status: "canceled",
    })
    .eq(ownerColumn, ownerId)
    .eq("stripe_subscription_id", stripeSubscriptionId);

  if (error) {
    console.error("[stripe webhook] Failed to mark subscription canceled:", {
      tableName,
      ownerColumn,
      ownerId,
      error,
    });
    throw error;
  }
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    console.error("[stripe webhook] Missing signature or STRIPE_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let event: Stripe.Event;

  const rawBody = await req.text();

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error("[stripe webhook] Error verifying signature:", err?.message || err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;

        const metadata = subscription.metadata || {};
        const scope = (metadata.scope as BillingScope | undefined) ?? "org";
        const ownerId = metadata.owner_id;
        const planCode = (metadata.plan_code as string | undefined) ?? null;

        if (!ownerId) {
          console.warn(
            "[stripe webhook] Subscription event missing owner_id metadata; skipping",
            {
              subscriptionId: subscription.id,
            },
          );
          break;
        }

        const stripeCustomerId =
          (subscription.customer as string | null | undefined) ?? "";
        if (!stripeCustomerId) {
          console.warn(
            "[stripe webhook] Subscription event missing customer; skipping",
            {
              subscriptionId: subscription.id,
            },
          );
          break;
        }

        await upsertSubscriptionRecord({
          scope,
          ownerId,
          stripeCustomerId,
          stripeSubscriptionId: subscription.id,
          planCode,
          status: subscription.status,
          currentPeriodEnd: subscription.current_period_end,
        });

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const metadata = subscription.metadata || {};
        const scope = (metadata.scope as BillingScope | undefined) ?? "org";
        const ownerId = metadata.owner_id;

        if (!ownerId) {
          console.warn(
            "[stripe webhook] Subscription deleted event missing owner_id; skipping",
            {
              subscriptionId: subscription.id,
            },
          );
          break;
        }

        await markSubscriptionCanceled({
          scope,
          ownerId,
          stripeSubscriptionId: subscription.id,
        });

        break;
      }

      default: {
        // For now, ignore other events
        // console.log("[stripe webhook] Unhandled event type:", event.type);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("[stripe webhook] Handler error:", err?.message || err);
    return NextResponse.json({ error: "Webhook handler error" }, { status: 500 });
  }
}
