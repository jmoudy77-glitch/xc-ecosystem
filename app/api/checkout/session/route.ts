// app/api/checkout/session/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

// Base app URL (used for success/cancel redirects)
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// Stripe price IDs from your environment
const ORG_ELITE_PRICE_ID = process.env.STRIPE_PRICE_COLLEGE_ELITE as string;
const ATHLETE_ELITE_PRICE_ID = process.env.STRIPE_PRICE_HS_ATHLETE_ELITE as string;

if (!ORG_ELITE_PRICE_ID) {
  console.warn("STRIPE_PRICE_COLLEGE_ELITE is not set in env vars.");
}
if (!ATHLETE_ELITE_PRICE_ID) {
  console.warn("STRIPE_PRICE_HS_ATHLETE_ELITE is not set in env vars.");
}

export async function POST(req: NextRequest) {
  try {
    const { scope, tier, orgId, athleteId } = await req.json();
    // scope: "org" | "athlete"
    // tier:  "basic" | "pro" | "elite" (internal label, optional)

    if (scope !== "org" && scope !== "athlete") {
      return NextResponse.json(
        { error: "Invalid scope. Must be 'org' or 'athlete'." },
        { status: 400 }
      );
    }

    let priceId: string;

    if (scope === "org") {
      // Org-level subscription (for programs / coaches)
      if (!orgId) {
        return NextResponse.json(
          { error: "Missing orgId for org-level subscription." },
          { status: 400 }
        );
      }

      if (!ORG_ELITE_PRICE_ID) {
        throw new Error("STRIPE_PRICE_COLLEGE_ELITE is not configured.");
      }

      priceId = ORG_ELITE_PRICE_ID;
    } else {
      // scope === "athlete" → personal athlete subscription
      if (!ATHLETE_ELITE_PRICE_ID) {
        throw new Error("STRIPE_PRICE_HS_ATHLETE_ELITE is not configured.");
      }

      // You *can* require athleteId here if you want:
      // if (!athleteId) {
      //   return NextResponse.json(
      //     { error: "Missing athleteId for athlete-level subscription." },
      //     { status: 400 }
      //   );
      // }

      priceId = ATHLETE_ELITE_PRICE_ID;
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
      success_url: `${APP_URL}/billing?status=success`,
      cancel_url: `${APP_URL}/billing?status=cancelled`,
      metadata: {
        scope,                   // "org" or "athlete"
        tier: tier ?? "elite",   // default tier if not provided
        orgId: orgId ?? "",
        athleteId: athleteId ?? "",
        // userId: ""             // add this later when you wire up auth
      },
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
      } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Error creating checkout session:", message);

      return NextResponse.json(
        { error: message },
        { status: 500 }
      );
      }
}

