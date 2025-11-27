// app/api/webhooks/stripe/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const dynamic = "force-dynamic"; 
// ❗ important: ensures Node.js runtime + raw body access
export const runtime = "nodejs"; // do NOT use "edge"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);


export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    console.error("❌ Missing Stripe signature header");
    return new Response("Unauthorized", { status: 401 });
  }

  let event;

  try {
    const body = await req.text(); // IMPORTANT: raw body
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("❌ Stripe signature verification failed:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Handle event types here
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    console.log("💰 Checkout completed:", session.id);

    // Example: upgrade user to elite
    // const userId = session.metadata?.userId;
    // await db.user.update({ where: { id: userId }, data: { tier: "elite" } });
  }

  return NextResponse.json({ received: true });
}
