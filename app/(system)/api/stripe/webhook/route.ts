// app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { kernelIngestStripeEvent } from "@/app/actions/kernelIngestStripeEvent";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
if (!webhookSecret) {
  throw new Error("STRIPE_WEBHOOK_SECRET is not set");
}

type BillingScope = "org" | "athlete";

function normalizeStatus(status: string | null | undefined): string {
  if (!status) return "unknown";
  const s = status.toLowerCase();
  if (["active", "trialing", "past_due", "canceled", "incomplete"].includes(s)) {
    return s;
  }
  return "unknown";
}

function extractStripeAmount(value: unknown): number {
  if (typeof value === "number") return value / 100;
  return 0;
}

function extractStripeCurrency(value: unknown): string | null {
  return typeof value === "string" ? value.toUpperCase() : null;
}

async function ingestEconomicEvent(args: {
  programId: string;
  eventType: string;
  amount: number;
  currency: string | null;
  externalRef: string;
  calculationJson: Record<string, unknown>;
}) {
  const { programId, eventType, amount, currency, externalRef, calculationJson } = args;

  return kernelIngestStripeEvent({
    programId,
    eventType,
    amount,
    currency,
    externalRef,
    calculationJson,
  });
}

async function upsertFromSubscription(args: {
  scope: BillingScope;
  ownerId: string;
  subscription: Stripe.Subscription;
}) {
  const { scope, ownerId, subscription } = args;

  const stripeCustomerId =
    (subscription.customer as string | null) ??
    (typeof subscription.customer === "object" && subscription.customer
      ? (subscription.customer as any).id
      : null);

  const stripeSubscriptionId = subscription.id;
  const planCode = (subscription.metadata?.plan_code as string | undefined) ?? null;
  const status = normalizeStatus(subscription.status);

  const currentPeriodEndUnix = (subscription as any).current_period_end as
    | number
    | null
    | undefined;

  const currentPeriodEnd = currentPeriodEndUnix
    ? new Date(currentPeriodEndUnix * 1000).toISOString()
    : null;

  let tableName: string;
  let ownerColumn: string;

  if (scope === "org") {
    // Program-level subscription
    tableName = "program_subscriptions";
    ownerColumn = "program_id";
  } else {
    // Athlete-level subscription
    tableName = "athlete_subscriptions";
    ownerColumn = "user_id";
  }

  const { error } = await supabaseAdmin
    .from(tableName)
    .upsert(
      {
        [ownerColumn]: ownerId,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        plan_code: planCode,
        status,
        current_period_end: currentPeriodEnd,
      },
      {
        onConflict: ownerColumn,
      },
    );

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

async function markCanceled(args: {
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
    ownerColumn = "user_id";
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
      stripeSubscriptionId,
      error,
    });
    throw error;
  }
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    console.error("[stripe webhook] Missing stripe-signature header");
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret!);
  } catch (err: any) {
    console.error("[stripe webhook] Signature verification failed:", err?.message || err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const metadata = (session.metadata || {}) as Record<string, string>;
        const scope = metadata.scope as BillingScope | undefined;
        const ownerId = metadata.owner_id as string | undefined;
        const planCode = metadata.plan_code as string | undefined;

        const subscriptionId = session.subscription as string | null;
        if (!scope || !ownerId || !subscriptionId) {
          console.warn("[stripe webhook] Missing metadata on checkout.session.completed", {
            scope,
            ownerId,
            subscriptionId,
          });
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
          expand: ["customer"],
        });

        // Ensure plan_code is set on the subscription for later events
        const existingPlanCode = subscription.metadata?.plan_code;
        if (!existingPlanCode && planCode) {
          await stripe.subscriptions.update(subscription.id, {
            metadata: {
              ...subscription.metadata,
              plan_code: planCode,
              scope,
              owner_id: ownerId,
            },
          });
          subscription.metadata.plan_code = planCode;
        }

        if (scope === "org") {
          await ingestEconomicEvent({
            programId: ownerId,
            eventType: event.type,
            amount: extractStripeAmount(session.amount_total),
            currency: extractStripeCurrency(session.currency),
            externalRef: event.id,
            calculationJson: {
              stripe_event_id: event.id,
              stripe_subscription_id: subscription.id,
              stripe_customer_id: session.customer ?? null,
              scope,
              owner_id: ownerId,
            },
          });
        } else {
          console.warn("[stripe webhook] Athlete scope missing program binding for kernel ingest", {
            eventId: event.id,
            scope,
            ownerId,
          });
        }

        await upsertFromSubscription({ scope, ownerId, subscription });
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const metadata = (subscription.metadata || {}) as Record<string, string>;
        const scope = metadata.scope as BillingScope | undefined;
        const ownerId = metadata.owner_id as string | undefined;

        if (!scope || !ownerId) {
          console.warn("[stripe webhook] subscription.updated missing scope/owner_id metadata", {
            subscriptionId: subscription.id,
          });
          break;
        }

        if (scope === "org") {
          const price = subscription.items?.data?.[0]?.price;
          await ingestEconomicEvent({
            programId: ownerId,
            eventType: event.type,
            amount: extractStripeAmount(price?.unit_amount),
            currency: extractStripeCurrency(price?.currency),
            externalRef: event.id,
            calculationJson: {
              stripe_event_id: event.id,
              stripe_subscription_id: subscription.id,
              scope,
              owner_id: ownerId,
              status: subscription.status,
            },
          });
        } else {
          console.warn("[stripe webhook] Athlete scope missing program binding for kernel ingest", {
            eventId: event.id,
            scope,
            ownerId,
          });
        }

        await upsertFromSubscription({ scope, ownerId, subscription });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const metadata = (subscription.metadata || {}) as Record<string, string>;
        const scope = metadata.scope as BillingScope | undefined;
        const ownerId = metadata.owner_id as string | undefined;

        if (!scope || !ownerId) {
          console.warn("[stripe webhook] subscription.deleted missing scope/owner_id metadata", {
            subscriptionId: subscription.id,
          });
          break;
        }

        if (scope === "org") {
          await ingestEconomicEvent({
            programId: ownerId,
            eventType: event.type,
            amount: 0,
            currency: null,
            externalRef: event.id,
            calculationJson: {
              stripe_event_id: event.id,
              stripe_subscription_id: subscription.id,
              scope,
              owner_id: ownerId,
              status: subscription.status,
            },
          });
        } else {
          console.warn("[stripe webhook] Athlete scope missing program binding for kernel ingest", {
            eventId: event.id,
            scope,
            ownerId,
          });
        }

        await markCanceled({
          scope,
          ownerId,
          stripeSubscriptionId: subscription.id,
        });
        break;
      }

      default: {
        // Ignore everything else for now
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("[stripe webhook] Handler error:", err?.message || err);
    return NextResponse.json({ error: "Webhook handler error" }, { status: 500 });
  }
}
