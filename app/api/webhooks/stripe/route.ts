// app/api/webhooks/stripe/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    console.error("❌ Missing Stripe signature header");
    return new Response("Unauthorized", { status: 401 });
  }

  let event: Stripe.Event;

  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("❌ Stripe signature verification failed:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log("💸 payment_intent.succeeded", paymentIntent.id);
      break;
    }
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log("✅ checkout.session.completed", session.id);
      // TODO: upgrade coach/program to elite here
      break;
    }
    default: {
      console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }
  }

  return NextResponse.json({ received: true });
}
