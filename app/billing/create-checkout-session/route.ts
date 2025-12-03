// app/billing/create-checkout-session/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import type { PlanCode } from "@/lib/billingPlans";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

type BillingScope = "org" | "athlete";

type CheckoutBody = {
  scope: BillingScope;
  ownerId: string;      // orgId, userId, or programId
  planCode: PlanCode;   // one of the defined plan codes
};

// Map planCode → Stripe price ID via env vars
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

function getBaseUrl(req: NextRequest): string {
  const headerOrigin = req.headers.get("origin");
  if (headerOrigin) return headerOrigin;
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  return "http://localhost:3000";
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CheckoutBody;
    const { scope, ownerId, planCode } = body;

    if (!scope || !ownerId || !planCode) {
      return NextResponse.json(
        { error: "Missing required fields: scope, ownerId, planCode" },
        { status: 400 },
      );
    }

    if (!["org", "athlete", "program"].includes(scope)) {
      return NextResponse.json(
        { error: "Invalid scope value" },
        { status: 400 },
      );
    }

    const priceId = PRICE_BY_PLAN[planCode];
    if (!priceId) {
      console.error("[create-checkout] No Stripe price ID for planCode:", planCode);
      return NextResponse.json(
        { error: "Stripe price ID not configured for this plan" },
        { status: 500 },
      );
    }

    const baseUrl = getBaseUrl(req);

    let successPath = "/billing";
    let cancelPath = "/billing";

    if (scope === "org") {
      successPath = `/programs/${ownerId}/billing`;
      cancelPath = `/programs/${ownerId}/billing`;
    } else if (scope === "athlete") {
      // In the future you could route to an athlete-specific billing page
      successPath = "/billing";
      cancelPath = "/billing";
    } else if (scope === "org") {
      // In the future you could route to an org-level billing page
      successPath = "/billing";
      cancelPath = "/billing";
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,   // you already look this up from planCode
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing/success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing/cancel`,

      // 🔴 NEW: this is what actually lands on Stripe.Subscription.metadata
      subscription_data: {
        metadata: {
          scope: body.scope,          // "org" for program-level
          owner_id: body.ownerId,     // programId
          plan_code: body.planCode,   // "college_elite" etc.
        },
      },

      // Optional but nice to have: metadata on the Checkout Session itself
      metadata: {
        scope: body.scope,
        owner_id: body.ownerId,
        plan_code: body.planCode,
      },
    });

    if (!session.url) {
      console.error("[create-checkout] No URL returned from Stripe:", session.id);
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
