// app/api/checkout/session/route.ts
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

const APP_URL = process.env.APP_URL || "http://localhost:3000";
const ELITE_PRICE_ID = process.env.STRIPE_PRICE_COLLEGE_ELITE;

if (!ELITE_PRICE_ID) {
  console.warn("STRIPE_PRICE_COLLEGE_ELITE is not set in env vars.");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const orgId = body.orgId || "e6581ece-3386-4e70-bd05-7feb2e7fd5d9"; // your org ID
    const tier = body.tier || "elite";

    if (!ELITE_PRICE_ID) {
      return NextResponse.json(
        { error: "Server missing STRIPE_PRICE_COLLEGE_ELITE" },
        { status: 500 }
      );
    }

    if (!orgId) {
      return NextResponse.json(
        { error: "Missing orgId" },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: ELITE_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${APP_URL}/billing?status=success`,
      cancel_url: `${APP_URL}/billing?status=cancelled`,
      metadata: {
        org_id: orgId,
        tier,
      },
    });

    return NextResponse.json(
      { url: session.url },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Error creating checkout session:", err);
    return NextResponse.json(
      { error: err.message || "Unknown error" },
      { status: 500 }
    );
  }
}
