// app/billing/create-portal-session/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

type BillingScope = "org" | "athlete" | "program";

type PortalBody = {
  scope: BillingScope;
  ownerId: string; // orgId, userId, or programId
};

function getBaseUrl(req: NextRequest): string {
  const headerOrigin = req.headers.get("origin");
  if (headerOrigin) return headerOrigin;
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  return "http://localhost:3000";
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PortalBody;
    const { scope, ownerId } = body;

    if (!scope || !ownerId) {
      return NextResponse.json(
        { error: "Missing required fields: scope, ownerId" },
        { status: 400 },
      );
    }

    if (!["org", "athlete", "program"].includes(scope)) {
      return NextResponse.json(
        { error: "Invalid scope value" },
        { status: 400 },
      );
    }

    // Determine subscription table + owner column by scope
    let tableName: string;
    let ownerColumn: string;

    if (scope === "program") {
      tableName = "program_subscriptions";
      ownerColumn = "program_id";
    } else if (scope === "athlete") {
      tableName = "athlete_subscriptions";
      ownerColumn = "user_id"; // adjust if your schema uses athlete_id instead
    } else {
      tableName = "org_subscriptions";
      ownerColumn = "org_id";
    }

    const { data, error } = await supabaseAdmin
      .from(tableName)
      .select("stripe_customer_id, status, current_period_end")
      .eq(ownerColumn, ownerId)
      .order("current_period_end", { ascending: false })
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
          current_period_end: string | null;
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
    let returnPath = "/billing";

    if (scope === "program") {
      returnPath = `/programs/${ownerId}/billing`;
    } else if (scope === "athlete") {
      returnPath = "/billing"; // or something like `/athlete/billing`
    } else if (scope === "org") {
      returnPath = "/billing"; // or something like `/org/billing`
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${baseUrl}${returnPath}`,
    });

    return NextResponse.json({ url: portalSession.url }, { status: 200 });
  } catch (err: unknown) {
    console.error("Portal session error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to create portal session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
