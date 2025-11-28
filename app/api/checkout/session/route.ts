// app/billing/create-checkout-session/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Stripe price IDs from your dashboard
const ORG_ELITE_PRICE_ID = process.env.STRIPE_ORG_ELITE_PRICE_ID!;
const ATHLETE_ELITE_PRICE_ID = process.env.STRIPE_ATHLETE_ELITE_PRICE_ID!;

type BillingScope = "org" | "athlete";

type CheckoutBody =
  | { scope: "org"; tier: "elite"; orgId: string }
  | { scope: "athlete"; tier: "elite"; athleteId: string };

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CheckoutBody;

// Determine owner ID using proper narrowing
let ownerId: string;

if (body.scope === "org") {
  ownerId = body.orgId;
} else {
  ownerId = body.athleteId;
}

const priceId =
  body.scope === "org" ? ORG_ELITE_PRICE_ID : ATHLETE_ELITE_PRICE_ID;

const metadata = {
  scope: body.scope,
  owner_id: ownerId,
  tier: "elite",
};

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL || "https://xc-ecosystem.vercel.app";

const session = await stripe.checkout.sessions.create({
  mode: "subscription",
  payment_method_types: ["card"],
  line_items: [{ price: priceId, quantity: 1 }],
  success_url: `${appUrl}/billing?success=1`,
  cancel_url: `${appUrl}/billing?canceled=1`,
  metadata,
  subscription_data: { metadata },
});


    if (!session.url) {
      return NextResponse.json(
        { error: "No checkout URL returned from Stripe" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err: unknown) {
    console.error("Error creating checkout session:", err);
    const message =
      err instanceof Error ? err.message : "Failed to create checkout session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


