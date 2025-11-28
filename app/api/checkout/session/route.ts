// app/api/checkout/session/route.ts
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

const APP_URL = process.env.APP_URL || "http://localhost:3000";
const ELITE_PRICE_ID = process.env.STRIPE_PRICE_COLLEGE_ELITE;

if (!ELITE_PRICE_ID) {
  console.warn("STRIPE_PRICE_COLLEGE_ELITE is not set in env vars.");
}

export async function POST(req: NextRequest) {
  const user = await auth();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { scope, tier, orgId, athleteId } = await req.json();
  // scope: "org" | "athlete"
  // tier:  "basic" | "pro" | "elite" (your internal tier string)

  let priceId: string;

  if (scope === "org") {
    if (!orgId) {
      return new NextResponse("Missing orgId for org-level subscription", {
        status: 400,
      });
    }

    // (optional) verify user actually belongs to that org
    const membership = await db.memberships.findFirst({
      where: { user_id: user.id, organization_id: orgId },
    });

    if (!membership) {
      return new NextResponse("User not a member of this organization", {
        status: 403,
      });
    }

    // Pick org price by tier if you have multiple
    priceId = ORG_ELITE_PRICE_ID; // or switch on `tier`
  } else if (scope === "athlete") {
    // This is a personal athlete plan
    // (you could also check athleteId belongs to user, etc.)
    priceId = ATHLETE_ELITE_PRICE_ID; // or switch on `tier`
  } else {
    return new NextResponse("Invalid scope", { status: 400 });
  }

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

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
      scope,          // "org" or "athlete"
      tier,           // "basic" | "pro" | "elite"
      orgId: orgId ?? "",
      athleteId: athleteId ?? "",
      userId: user.id, // who clicked checkout
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
