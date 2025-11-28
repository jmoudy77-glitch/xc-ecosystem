// app/billing/create-checkout-session/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import type { PlanCode } from "@/lib/billingPlans";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

type BillingScope = "org" | "athlete";

type CheckoutBody = {
  scope: BillingScope;
  ownerId: string;      // orgId or userId
  planCode: PlanCode;   // one of the 9 codes above
};

// Map planCode → Stripe price ID
const PRICE_BY_PLAN: Record<PlanCode, string> = {
  hs_athlete_basic: process.env.STRIPE_PRICE_HS_ATHLETE_BASIC || "",
  hs_athlete_pro: process.env.STRIPE_PRICE_HS_ATHLETE_PRO || "",
  hs_athlete_elite: process.env.STRIPE_PRICE_HS_ATHLETE_ELITE || "",
  hs_starter: process.env.STRIPE_PRICE_HS_STARTER || "",
  hs_pro: process.env.STRIPE_PRICE_HS_PRO || "",
  hs_elite: process.env.STRIPE_PRICE_HS_ELITE || "",
  college_starter: process.env.STRIPE_PRICE_COLLEGE_STARTER || "",
  college_pro: process.env.STRIPE_PRICE_COLLEGE_PRO || "",
  college_elite: process.env.STRIPE_PRICE_COLLEGE_ELITE || "",
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CheckoutBody;

    const { scope, ownerId, planCode } = body;

    if (!ownerId) {
      return NextResponse.json(
        { error: "Missing ownerId for checkout" },
        { status: 400 },
      );
    }

    const priceId = PRICE_BY_PLAN[planCode];
    if (!priceId) {
      return NextResponse.json(
        { error: `No Stripe price configured for plan ${planCode}` },
        { status: 500 },
      );
    }

    const metadata = {
      scope,           // "org" | "athlete"
      owner_id: ownerId,
      plan_code: planCode, // 👈 core link between Stripe and DB
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
      subscription_data: {
        metadata,
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "No checkout URL returned from Stripe" },
        { status: 500 },
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


