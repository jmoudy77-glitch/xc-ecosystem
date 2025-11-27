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
    const body = await req.text(); // raw body for signature verification
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("❌ Stripe signature verification failed:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
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
        console.log("✅ checkout.session.completed", session.id);

        // 🔑 This is where we upgrade the coach/program to "elite"
        const userId = session.metadata?.userId;
        if (userId) {
          // TODO: replace with your real DB call
          // await db.user.update({
          //   where: { id: userId },
          //   data: { tier: "elite" },
          // });
          console.log("✨ Upgrading user to elite:", userId);
        }
        break;
      }
      default: {
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
      }
    }
  } catch (err) {
    console.error("❌ Error handling Stripe event:", err);
    return new Response("Webhook handler failed", { status: 500 });
  }

  return NextResponse.json({ received: true });
}
