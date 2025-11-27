// app/api/billing/create-checkout-session/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // You can pull this from your auth instead of the body if you prefer
    const { userId } = body; // e.g. current coach's user id

    if (!userId) {
      return new NextResponse("Missing userId", { status: 400 });
    }

    // TODO: replace with your actual price ID for "elite"
    const priceId = process.env.STRIPE_ELITE_PRICE_ID!;
    if (!priceId) {
      return new NextResponse("Missing STRIPE_ELITE_PRICE_ID", {
        status: 500,
      });
    }

    const origin =
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription", // or "payment" if one-time
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/billing/cancelled`,
      metadata: {
        userId, // 🔑 we read this in the webhook
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("❌ Error creating checkout session:", err);
    return new NextResponse("Error creating checkout session", {
      status: 500,
    });
  }
}
