// app/api/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import type { PlanCode, CoarseTier } from "@/lib/billingPlans";
import { getCoarseTier } from "@/lib/billingPlans";

export const dynamic = "force-dynamic";

type BillingScope = "org" | "athlete";
type BillingStatus = "active" | "past_due" | "canceled" | "trialing" | "none";

type MeResponse = {
  user: {
    id: string;
    email: string;
    name: string | null;
    // High-level “mode” for the app; detailed roles still live on memberships
    role: "coach" | "athlete";
  };
  org?: {
    id: string;
    name: string;
    type: string | null;
  };
  billing: {
    scope: BillingScope;
    planCode: PlanCode | null;  // e.g. "hs_athlete_pro", "college_elite"
    tier: CoarseTier;           // "free" | "starter" | "pro" | "elite"
    status: BillingStatus;
  };
};

export async function GET(_req: NextRequest) {
  const supabase = createSupabaseServerClient();

  // 1) Auth user from Supabase Auth
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2) App user row in your "users" table
  const { data: appUser, error: userError } = await supabase
    .from("users")
    .select(
      `
      id,
      auth_id,
      email,
      name,
      subscription_tier,
      billing_status
    `
    )
    .eq("auth_id", authUser.id)
    .maybeSingle();

  if (userError || !appUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // 3) Memberships → determine if this user is part of an org (coach mode)
  const { data: memberships, error: membershipsError } = await supabase
    .from("memberships")
    .select("organization_id, role")
    .eq("user_id", appUser.id)
    .order("created_at", { ascending: true });

  if (membershipsError) {
    console.error("Error loading memberships:", membershipsError);
  }

  const hasOrg = !!(memberships && memberships.length > 0);
  const primaryMembership = hasOrg ? memberships[0] : null;

  // Shared billing state
  let scope: BillingScope;
  let role: "coach" | "athlete";
  let status: BillingStatus = "none";
  let planCode: PlanCode | null = null;
  let orgRow:
    | {
        id: string;
        name: string;
        type: string | null;
        subscription_tier: string | null;
        billing_status: string | null;
      }
    | null = null;

  if (hasOrg && primaryMembership) {
    // 👉 Coach / program context
    scope = "org";
    role = "coach";

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select(`
        id,
        name,
        type,
        subscription_tier,
        billing_status
      `)
      .eq("id", primaryMembership.organization_id)
      .maybeSingle();

    if (orgError) {
      console.error("Error loading organization:", orgError);
    }

    if (org) {
      orgRow = org;
      planCode = (org.subscription_tier as PlanCode | null) ?? null;
      status = (org.billing_status as BillingStatus | null) ?? "none";
    } else {
      // Fallback to user-level billing if org row not found
      planCode = (appUser.subscription_tier as PlanCode | null) ?? null;
      status = (appUser.billing_status as BillingStatus | null) ?? "none";
    }
  } else {
    // 👉 Athlete / personal context
    scope = "athlete";
    role = "athlete";

    planCode = (appUser.subscription_tier as PlanCode | null) ?? null;
    status = (appUser.billing_status as BillingStatus | null) ?? "none";
  }

  const tier: CoarseTier = getCoarseTier(planCode);

  const payload: MeResponse = {
    user: {
      id: appUser.id,
      email: appUser.email ?? authUser.email ?? "",
      name:
        appUser.name ??
        (authUser.user_metadata?.name as string | undefined) ??
        null,
      role,
    },
    org: orgRow
      ? {
          id: orgRow.id,
          name: orgRow.name,
          type: orgRow.type ?? null,
        }
      : undefined,
    billing: {
      scope,
      planCode,
      tier,
      status,
    },
  };

  return NextResponse.json(payload, { status: 200 });
}

