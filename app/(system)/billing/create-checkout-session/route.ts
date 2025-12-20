// app/billing/create-checkout-session/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import type { PlanCode } from "@/lib/billingPlans";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

type BillingScope = "org" | "athlete";

type CheckoutBody = {
  scope: BillingScope;      // "org" for program, "athlete" for personal
  ownerId: string;          // programId for org, userId for athlete
  planCode: PlanCode;       // one of the plan codes from billingPlans.ts
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

  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Partial<CheckoutBody>;

    const scope = body.scope;
    const ownerId = body.ownerId;
    const planCode = body.planCode;

    if (!scope || !ownerId || !planCode) {
      return NextResponse.json(
        { error: "Missing scope, ownerId, or planCode" },
        { status: 400 },
      );
    }

    const priceId = PRICE_BY_PLAN[planCode];
    if (!priceId) {
      return NextResponse.json(
        { error: `No Stripe price configured for planCode=${planCode}` },
        { status: 400 },
      );
    }

    const baseUrl = getBaseUrl(req);

    // 👇 Where Stripe sends the user after checkout
    let successPath = "/billing";
    let cancelPath = "/billing";

    if (scope === "org") {
      // Program-level billing
      successPath = `/programs/${ownerId}/billing`;
      cancelPath = `/programs/${ownerId}/billing`;
    } else if (scope === "athlete") {
      // Personal athlete billing
      successPath = "/billing";
      cancelPath = "/billing";
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}${successPath}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}${cancelPath}?cancelled=1`,

      // We attach metadata so the webhook knows who/what this subscription is for
      metadata: {
        scope,
        owner_id: ownerId,
        plan_code: planCode,
      },
      subscription_data: {
        metadata: {
          scope,
          owner_id: ownerId,
          plan_code: planCode,
        },
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
    console.error("[create-checkout-session] Error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to create checkout session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}