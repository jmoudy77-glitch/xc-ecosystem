// app/api/webhooks/stripe/route.ts
// (if you use src/app, put this in src/app/api/webhooks/stripe/route.ts)
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // ensures Node runtime for raw body

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-06-20",
});

// 🔍 Simple GET handler just for testing in the browser
export async function GET() {
  return NextResponse.json({ ok: true, message: "Stripe webhook route is alive" });
}

// Actual webhook handler
export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    console.error("❌ Missing Stripe signature header");
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let event: Stripe.Event;

  try {
    const body = await req.text(); // RAW body for Stripe
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (err: any) {
    console.error("❌ Stripe signature verification failed:", err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
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

        const userId = session.metadata?.userId;
        if (userId) {
          // TODO: plug your DB upgrade here
          // await db.user.update({ where: { id: userId }, data: { tier: "elite" } });
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
    return new NextResponse("Webhook handler failed", { status: 500 });
  }

  return NextResponse.json({ received: true });
}
