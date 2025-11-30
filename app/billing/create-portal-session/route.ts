// app/billing/create-portal-session/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Creates a Stripe Billing Portal session for either:
 * - a program subscription (scope = "program")
 * - an athlete subscription (scope = "athlete")
 *
 * The client must send:
 *   { scope: "program" | "athlete", ownerId: string }
 *
 * We then:
 *   1. Verify the user is authenticated
 *   2. Look up the most recent subscription row for that owner
 *   3. Use its stripe_customer_id to open a Billing Portal session
 */

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

type BillingScope = "program" | "athlete";

type PortalBody = {
  scope: BillingScope;
  ownerId: string; // program.id or users.id
};

function getBaseUrl() {
  const url =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "http://localhost:3000";
  return url.replace(/\/$/, "");
}

export async function POST(req: NextRequest) {
  try {
    const { supabase } = await supabaseServer();

    // Ensure user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error("[billing/create-portal-session] Auth error:", authError);
      return NextResponse.json(
        { error: "Failed to verify authentication" },
        { status: 500 },
      );
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as PortalBody;
    const { scope, ownerId } = body || {};

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

    // Look up the most recent subscription row for this owner
    let customerId: string | null = null;

    if (scope === "program") {
      const { data, error } = await supabaseAdmin
        .from("program_subscriptions")
        .select("stripe_customer_id, current_period_end")
        .eq("program_id", ownerId)
        .order("current_period_end", { ascending: false })
        .limit(1);

      if (error) {
        console.error(
          "[billing/create-portal-session] Failed to load program_subscriptions:",
          error,
        );
        return NextResponse.json(
          { error: "Failed to load program subscription" },
          { status: 500 },
        );
      }

      if (!data || data.length === 0 || !data[0].stripe_customer_id) {
        return NextResponse.json(
          { error: "No program subscription found for this program." },
          { status: 404 },
        );
      }

      customerId = data[0].stripe_customer_id;
    } else if (scope === "athlete") {
      const { data, error } = await supabaseAdmin
        .from("athlete_subscriptions")
        .select("stripe_customer_id, current_period_end")
        .eq("user_id", ownerId)
        .order("current_period_end", { ascending: false })
        .limit(1);

      if (error) {
        console.error(
          "[billing/create-portal-session] Failed to load athlete_subscriptions:",
          error,
        );
        return NextResponse.json(
          { error: "Failed to load athlete subscription" },
          { status: 500 },
        );
      }

      if (!data || data.length === 0 || !data[0].stripe_customer_id) {
        return NextResponse.json(
          { error: "No athlete subscription found for this user." },
          { status: 404 },
        );
      }

      customerId = data[0].stripe_customer_id;
    }

    if (!customerId) {
      return NextResponse.json(
        { error: "Missing Stripe customer for this subscription." },
        { status: 400 },
      );
    }

    const baseUrl = getBaseUrl();

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/billing`,
    });

    if (!portalSession.url) {
      return NextResponse.json(
        { error: "Failed to create billing portal session" },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: portalSession.url }, { status: 200 });
  } catch (err) {
    console.error("[billing/create-portal-session] Unexpected error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to create portal session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
