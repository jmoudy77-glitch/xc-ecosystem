// app/api/stripe/webhook/route.ts
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type Stripe from "stripe";

export const runtime = "nodejs"; // ensure Node runtime for Stripe

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!webhookSecret) {
  throw new Error("Missing STRIPE_WEBHOOK_SECRET environment variable");
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json(
      { error: "Missing Stripe signature" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      webhookSecret
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const orgId = session.metadata?.org_id as string | undefined;
        const tier = (session.metadata?.tier as string | undefined) || "pro";
        const customerId = session.customer as string | null;
        const subscriptionId = session.subscription as string | null;

        if (!orgId) {
          console.warn("checkout.session.completed: missing org_id metadata");
          break;
        }

        // Mark org as active and store Stripe ids
        const { error } = await supabaseAdmin
          .from("organizations")
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            subscription_tier: tier,
            billing_status: "active",
          })
          .eq("id", orgId);

        if (error) {
          console.error("Error updating organization on checkout:", error.message);
        }

        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const status = subscription.status; // 'active', 'past_due', 'canceled', etc.

        let billingStatus: "active" | "inactive" | "past_due";
        if (status === "active") billingStatus = "active";
        else if (status === "past_due") billingStatus = "past_due";
        else billingStatus = "inactive";

        const { error } = await supabaseAdmin
          .from("organizations")
          .update({
            billing_status: billingStatus,
          })
          .eq("stripe_subscription_id", subscription.id);

        if (error) {
          console.error("Error updating organization on subscription.updated:", error.message);
        }

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        const { error } = await supabaseAdmin
          .from("organizations")
          .update({
            billing_status: "inactive",
          })
          .eq("stripe_subscription_id", subscription.id);

        if (error) {
          console.error("Error updating organization on subscription.deleted:", error.message);
        }

        break;
      }

      default: {
        // For now we ignore other events
        console.log(`Unhandled event type: ${event.type}`);
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    console.error("Error handling webhook event:", err);
    return NextResponse.json(
      { error: "Webhook handler error" },
      { status: 500 }
    );
  }
}
