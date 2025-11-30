// app/billing/create-checkout-session/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import type { PlanCode } from "@/lib/billingPlans";

/**
 * This route creates a Stripe Checkout session for either:
 * - a program (coach / team) subscription, or
 * - an individual athlete subscription.
 *
 * It does NOT touch the database directly. Instead, it encodes
 * ownership and plan information in Stripe metadata so that the
 * webhook can write into:
 *   - program_subscriptions (for scope = "program")
 *   - athlete_subscriptions (for scope = "athlete")
 */

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

/**
 * Billing scopes:
 * - "program" → ownerId is a program.id (team-level subscription)
 * - "athlete" → ownerId is a users.id (athlete account subscription)
 */
type BillingScope = "program" | "athlete";

type CheckoutBody = {
  scope: BillingScope;
  ownerId: string;      // programId or userId
  planCode: PlanCode;   // one of the defined plan codes
  successUrl?: string;  // optional override from client
  cancelUrl?: string;   // optional override from client
};

// Map planCode → Stripe price ID (all must be defined in env)
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

function getBaseUrl() {
  // Prefer app URL from env, fall back to localhost
  const url =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "http://localhost:3000";
  return url.replace(/\/$/, ""); // remove trailing slash
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CheckoutBody;
    const { scope, ownerId, planCode, successUrl, cancelUrl } = body || {};

    if (!scope || (scope !== "program" && scope !== "athlete")) {
      return NextResponse.json(
        { error: "Invalid or missing scope. Expected 'program' or 'athlete'." },
        { status: 400 },
      );
    }

    if (!ownerId) {
      return NextResponse.json(
        { error: "Missing ownerId (programId or userId)." },
        { status: 400 },
      );
    }

    if (!planCode) {
      return NextResponse.json(
        { error: "Missing planCode." },
        { status: 400 },
      );
    }

    const priceId = PRICE_BY_PLAN[planCode];
    if (!priceId) {
      return NextResponse.json(
        {
          error: `No Stripe price configured for planCode '${planCode}'. Check your STRIPE_PRICE_* env vars.`,
        },
        { status: 500 },
      );
    }

    const baseUrl = getBaseUrl();

    const resolvedSuccessUrl =
      successUrl ||
      `${baseUrl}/billing/success?scope=${encodeURIComponent(
        scope,
      )}&plan=${encodeURIComponent(planCode)}`;

    const resolvedCancelUrl =
      cancelUrl || `${baseUrl}/billing/cancelled?scope=${encodeURIComponent(scope)}`;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: resolvedSuccessUrl,
      cancel_url: resolvedCancelUrl,
      customer_creation: "if_required",
      // Put metadata on the subscription itself so the webhook can
      // read it directly from the subscription object.
      subscription_data: {
        metadata: {
          scope,               // "program" | "athlete"
          owner_id: ownerId,   // program.id or users.id
          plan_code: planCode, // used by webhook to route to correct table
        },
      },
    });

    if (!session.url) {
      return NextResponse.json(
        {
          error:
            "Stripe session created but no redirect URL was returned. Check Stripe configuration.",
        },
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
