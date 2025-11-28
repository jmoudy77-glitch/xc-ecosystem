// app/billing/create-portal-session/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();

    // 1) Auth user
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2) App user record
    const { data: appUser } = await supabase
      .from("users")
      .select("id, subscription_tier, billing_status, stripe_customer_id")
      .eq("auth_id", authUser.id)
      .maybeSingle();

    if (!appUser) {
      return NextResponse.json(
        { error: "User record not found" },
        { status: 404 },
      );
    }

    // 3) Org memberships
    const { data: memberships } = await supabase
      .from("memberships")
      .select("organization_id, role")
      .eq("user_id", appUser.id);

    const isCoach = memberships && memberships.length > 0;

    // 🔑 Make this always a string (no null)
    let stripeCustomerId: string;

    if (isCoach) {
      // Coach → use org Stripe customer
      const primaryOrgId = memberships[0].organization_id;

      const { data: org } = await supabase
        .from("organizations")
        .select("id, stripe_customer_id")
        .eq("id", primaryOrgId)
        .maybeSingle();

      if (!org || !org.stripe_customer_id) {
        return NextResponse.json(
          { error: "No Stripe customer found for organization" },
          { status: 400 },
        );
      }

      stripeCustomerId = org.stripe_customer_id;
    } else {
      // Athlete → use user Stripe customer
      if (!appUser.stripe_customer_id) {
        return NextResponse.json(
          { error: "No Stripe customer found for user" },
          { status: 400 },
        );
      }

      stripeCustomerId = appUser.stripe_customer_id;
    }

    // 5) Create Billing Portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId, // ✅ now guaranteed string
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err: unknown) {
    console.error("Portal session error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to create portal session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
