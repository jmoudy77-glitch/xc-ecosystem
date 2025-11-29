// app/api/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Role = "coach" | "athlete";
type BillingScope = "org" | "athlete" | "none";

interface AppUserRow {
  id: string;
  auth_id: string;
  email: string | null;
  name: string | null;
  subscription_tier: string | null;
  billing_status: string | null;
  stripe_customer_id: string | null;
}

interface MembershipRow {
  organization_id: string;
  role: string | null;
}

interface OrgRow {
  id: string;
  name: string | null;
  subscription_tier: string | null;
  billing_status: string | null;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(req: NextRequest) {
  try {
    // 1) Read token from Authorization header: "Bearer <token>"
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return NextResponse.json(
        { error: "Not authenticated (no token)" },
        { status: 401 }
      );
    }

    // 2) Ask Supabase who this token belongs to
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError) {
      console.error("[/api/me] Auth error:", authError);
      return NextResponse.json(
        { error: "Auth error fetching user" },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated (invalid token)" },
        { status: 401 }
      );
    }

    // 3) Load app user row by auth_id
    const {
      data: userRow,
      error: userError,
    } = await supabase
      .from("users")
      .select(
        `
        id,
        auth_id,
        email,
        name,
        subscription_tier,
        billing_status,
        stripe_customer_id
      `
      )
      .eq("auth_id", user.id)
      .maybeSingle();

    if (userError) {
      console.error("[/api/me] users lookup error:", userError);
      return NextResponse.json(
        { error: "User lookup failed" },
        { status: 500 }
      );
    }

    if (!userRow) {
      return NextResponse.json(
        { error: "User record not found" },
        { status: 404 }
      );
    }

    const appUser = userRow as AppUserRow;

    // 4) Memberships → derive coach vs athlete + primary org
    const {
      data: memberships,
      error: membershipError,
    } = await supabase
      .from("memberships")
      .select("organization_id, role")
      .eq("user_id", appUser.id);

    if (membershipError) {
      console.error("[/api/me] memberships lookup error:", membershipError);
    }

    const membershipList = (memberships ?? []) as MembershipRow[];
    const isCoach = membershipList.length > 0;
    const primaryOrgId = isCoach ? membershipList[0].organization_id : null;

    // 5) Load org row if there is a primary org
    let orgRow: OrgRow | null = null;

    if (primaryOrgId) {
      const {
        data: org,
        error: orgError,
      } = await supabase
        .from("organizations")
        .select("id, name, subscription_tier, billing_status")
        .eq("id", primaryOrgId)
        .maybeSingle();

      if (orgError) {
        console.error("[/api/me] organizations lookup error:", orgError);
      } else if (org) {
        orgRow = org as OrgRow;
      }
    }

    // 6) Compute role, billingScope, and effective tiers
    const inferredRole: Role = isCoach ? "coach" : "athlete";

    let billingScope: BillingScope = "none";
    if (isCoach && orgRow) {
      billingScope = "org";
    } else if (!isCoach) {
      billingScope = "athlete";
    }

    // User-level (athlete) tier
    const athleteTier =
      appUser.subscription_tier ??
      (inferredRole === "athlete" ? "HS ATHLETE BASIC" : null);

    // Org-level tier
    const orgTier = orgRow?.subscription_tier ?? null;

    // 7) Build response matching MeResponse (BillingPageClient.tsx)
    const payload = {
      user: {
        id: appUser.id,
        email: appUser.email ?? user.email ?? "",
        role: inferredRole,
        orgId: primaryOrgId,
        athleteId: null as string | null,
      },
      billingScope,
      org:
        orgRow && primaryOrgId
          ? {
              id: primaryOrgId,
              name: orgRow.name ?? "Organization",
              subscriptionTier: orgTier,
            }
          : null,
      athlete:
        inferredRole === "athlete"
          ? {
              id: appUser.id,
              name: appUser.name ?? appUser.email ?? user.email ?? "Athlete",
              subscriptionTier: athleteTier,
            }
          : null,
      tiers: {
        athlete: athleteTier,
        org: orgTier,
      },
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    console.error("[/api/me] Unhandled error:", err);
    return NextResponse.json(
      { error: "Unexpected server error in /api/me" },
      { status: 500 }
    );
  }
}





