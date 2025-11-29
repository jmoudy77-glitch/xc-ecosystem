// app/api/me/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type Role = "coach" | "athlete";
type BillingScope = "org" | "athlete" | "none";

interface AppUserRow {
  id: string;
  email: string;
  role: Role;
  org_id: string | null;
  athlete_id: string | null;
  coach_subscription_tier: string | null;
  athlete_subscription_tier: string | null;
}

interface OrgRow {
  id: string;
  name: string;
  subscription_tier: string | null;
}

interface AthleteRow {
  id: string;
  name: string;
  subscription_tier: string | null;
}

export async function GET() {
  try {
    const { supabase, accessToken } = await supabaseServer(); // ✅


    if (!accessToken) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // 1. Authenticated user (via JWT from cookie)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken);

    if (authError) {
      console.error("[/api/me] Auth error:", authError);
      return NextResponse.json(
        { error: "Auth error fetching user" },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // 2. App user row
    const {
      data: userRow,
      error: userError,
    } = await supabase
      .from("users")
      .select(
        `
        id,
        email,
        role,
        org_id,
        athlete_id,
        coach_subscription_tier,
        athlete_subscription_tier
      `
      )
      .eq("id", user.id)
      .single();

    if (userError || !userRow) {
      console.error("[/api/me] users lookup error:", userError);
      return NextResponse.json(
        { error: "User record not found" },
        { status: 500 }
      );
    }

    const appUser = userRow as AppUserRow;

    // 3. Org row (optional)
    let org: OrgRow | null = null;
    if (appUser.org_id) {
      const { data, error } = await supabase
        .from("organizations")
        .select(
          `
          id,
          name,
          subscription_tier
        `
        )
        .eq("id", appUser.org_id)
        .single();

      if (error) {
        console.error("[/api/me] organizations lookup error:", error);
      } else if (data) {
        org = data as OrgRow;
      }
    }

    // 4. Athlete row (optional)
    let athlete: AthleteRow | null = null;
    if (appUser.athlete_id) {
      const { data, error } = await supabase
        .from("athletes")
        .select(
          `
          id,
          name,
          subscription_tier
        `
        )
        .eq("id", appUser.athlete_id)
        .single();

      if (error) {
        console.error("[/api/me] athletes lookup error:", error);
      } else if (data) {
        athlete = data as AthleteRow;
      }
    }

    // 5. Billing scope + effective tiers
    let billingScope: BillingScope = "none";

    if (appUser.role === "coach" && org) {
      billingScope = "org";
    } else if (appUser.role === "athlete" && athlete) {
      billingScope = "athlete";
    }

    const athleteTierFromRow = athlete?.subscription_tier ?? null;
    const orgTierFromRow = org?.subscription_tier ?? null;

    // HS ATHLETE BASIC = default free tier for athletes with no paid plan
    const effectiveAthleteTier =
      athleteTierFromRow ??
      appUser.athlete_subscription_tier ??
      (appUser.role === "athlete" ? "HS ATHLETE BASIC" : null);

    const effectiveOrgTier =
      orgTierFromRow ?? appUser.coach_subscription_tier ?? null;

    const payload = {
      user: {
        id: appUser.id,
        email: appUser.email,
        role: appUser.role,
        orgId: appUser.org_id,
        athleteId: appUser.athlete_id,
      },
      billingScope,
      org: org
        ? {
            id: org.id,
            name: org.name,
            subscriptionTier: effectiveOrgTier,
          }
        : null,
      athlete: athlete
        ? {
            id: athlete.id,
            name: athlete.name,
            subscriptionTier: effectiveAthleteTier,
          }
        : null,
      tiers: {
        athlete: effectiveAthleteTier,
        org: effectiveOrgTier,
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


