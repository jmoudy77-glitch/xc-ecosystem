// app/billing/create-portal-session/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

type BillingScope = "org" | "athlete";

type PortalBody = {
  scope: BillingScope;  // "org" for program, "athlete" for personal
  ownerId: string;      // programId for org, userId for athlete
};

function getBaseUrl(req: NextRequest): string {
  const headerOrigin = req.headers.get("origin");
  if (headerOrigin) return headerOrigin;

  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Partial<PortalBody>;
    const scope = body.scope;
    const ownerId = body.ownerId;

    if (!scope || !ownerId) {
      return NextResponse.json(
        { error: "Missing scope or ownerId" },
        { status: 400 },
      );
    }

    // Look up the Stripe customer from our DB
    let tableName: string;
    let ownerColumn: string;

    if (scope === "org") {
      tableName = "program_subscriptions";
      ownerColumn = "program_id";
    } else {
      tableName = "athlete_subscriptions";
      ownerColumn = "user_id";
    }

    const { data, error } = await supabaseAdmin
      .from(tableName)
      .select("stripe_customer_id, status")
      .eq(ownerColumn, ownerId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("[create-portal-session] Supabase select error:", error);
      return NextResponse.json(
        { error: "Failed to load subscription record" },
        { status: 500 },
      );
    }

    const row = data?.[0] as
      | {
          stripe_customer_id: string | null;
          status: string | null;
        }
      | undefined;

    if (!row || !row.stripe_customer_id) {
      return NextResponse.json(
        { error: "No active subscription / customer found for this owner" },
        { status: 404 },
      );
    }

    const stripeCustomerId = row.stripe_customer_id;
    const baseUrl = getBaseUrl(req);

    // 👇 Where Stripe sends the user after closing the billing portal
    let returnPath = "/billing";

    if (scope === "org") {
      returnPath = `/programs/${ownerId}/billing`;
    } else if (scope === "athlete") {
      returnPath = "/billing";
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${baseUrl}${returnPath}`,
    });

    return NextResponse.json({ url: portalSession.url }, { status: 200 });
  } catch (err: unknown) {
    console.error("[create-portal-session] Error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to create portal session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}