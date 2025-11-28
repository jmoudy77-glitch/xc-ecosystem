// app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

// Simple GET for sanity-checking in the browser
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Stripe webhook endpoint is alive",
  });
}

// POST: actual webhook handler
export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    console.error("❌ Missing stripe-signature header");
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let event: Stripe.Event;

  try {
    const body = await req.text(); // raw body is required for Stripe
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown Stripe webhook error";
    console.error("❌ Stripe signature verification failed:", message);
    return new NextResponse(`Webhook Error: ${message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log("💸 payment_intent.succeeded", paymentIntent.id);
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata || {};

        console.log("✅ checkout.session.completed", {
          id: session.id,
          metadata,
          customer: session.customer,
          subscription: session.subscription,
        });

        const scope = metadata.scope; // "org" | "athlete" | undefined
        const tier = metadata.tier;
        const orgId = metadata.orgId;
        const athleteId = metadata.athleteId;

        // 🔎 For now we just log what we *would* do
        if (scope === "org") {
          console.log(
            "👉 Org-level subscription completed",
            JSON.stringify({ orgId, tier }, null, 2)
          );
          // TODO: when you have a DB client:
          // - update organizations.subscription_tier, billing_status, stripe ids
        } else if (scope === "athlete") {
          console.log(
            "👉 Athlete-level subscription completed",
            JSON.stringify({ athleteId, tier }, null, 2)
          );
          // TODO: when you have a DB client:
          // - update users (or athlete table) subscription info
        } else {
          console.log("ℹ️ checkout.session.completed with no scope in metadata");
        }

        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log("🔁 subscription lifecycle event", {
          type: event.type,
          id: subscription.id,
          status: subscription.status,
          customer: subscription.customer,
        });
        // TODO later: sync status to your DB
        break;
      }

      default: {
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
      }
    }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown handler error";
    console.error("❌ Error handling Stripe event:", message);
    return new NextResponse("Webhook handler failed", { status: 500 });
  }

  return NextResponse.json({ received: true });
}


