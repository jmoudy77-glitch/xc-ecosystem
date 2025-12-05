// app/api/programs/[programId]/teams/[teamId]/seasons/[seasonId]/budget/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type RouteParams = {
  params: Promise<{
    programId: string;
    teamId: string;
    seasonId: string;
  }>;
};

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  // 👇 This was the problem — params is a Promise in this setup
  const { programId, teamId, seasonId } = await params;

  // 1) Auth via Supabase (using same helper pattern as server components)
  const supabase = await supabaseServerComponent();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("[SeasonBudget PATCH] auth error:", authError);
  }

  if (!user) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  const authId = user.id;

  // 2) Resolve viewer's users row
  const { data: userRow, error: userError } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("auth_id", authId)
    .maybeSingle();

  if (userError) {
    console.error("[SeasonBudget PATCH] users error:", userError);
    return NextResponse.json(
      { error: "Failed to load user record" },
      { status: 500 }
    );
  }

  if (!userRow) {
    return NextResponse.json(
      { error: "User record not found" },
      { status: 403 }
    );
  }

  const viewerUserId = userRow.id as string;

  // 3) Check program membership + role
  const { data: membership, error: membershipError } = await supabaseAdmin
    .from("program_members")
    .select("id, role, program_id")
    .eq("program_id", programId)
    .eq("user_id", viewerUserId)
    .maybeSingle();

  if (membershipError) {
    console.error(
      "[SeasonBudget PATCH] membership error:",
      membershipError
    );
    return NextResponse.json(
      { error: "Failed to load membership" },
      { status: 500 }
    );
  }

  if (!membership) {
    return NextResponse.json(
      { error: "Not a member of this program" },
      { status: 403 }
    );
  }

  const role = (membership.role as string | null)?.toLowerCase() ?? null;

  // Head coach only guard
  if (role !== "head_coach") {
    return NextResponse.json(
      { error: "Only the head coach can edit the scholarship budget." },
      { status: 403 }
    );
  }

  // 4) Parse body
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const rawEquiv = body?.scholarship_budget_equivalents;
  const rawAmount = body?.scholarship_budget_amount;
  const rawCurrency = body?.scholarship_currency;

  const equiv =
    rawEquiv === null || rawEquiv === "" || rawEquiv === undefined
      ? null
      : Number(rawEquiv);
  const amount =
    rawAmount === null || rawAmount === "" || rawAmount === undefined
      ? null
      : Number(rawAmount);
  const currency =
    typeof rawCurrency === "string" && rawCurrency.trim() !== ""
      ? rawCurrency.toUpperCase()
      : "USD";

  if (
    (equiv !== null && Number.isNaN(equiv)) ||
    (amount !== null && Number.isNaN(amount))
  ) {
    return NextResponse.json(
      { error: "Budget values must be numeric or null." },
      { status: 400 }
    );
  }

  // 5) Update the team_seasons row
  const { error: updateError } = await supabaseAdmin
    .from("team_seasons")
    .update({
      scholarship_budget_equivalents: equiv,
      scholarship_budget_amount: amount,
      scholarship_currency: currency,
    })
    .eq("id", seasonId)
    .eq("team_id", teamId);

  if (updateError) {
    console.error("[SeasonBudget PATCH] update error:", updateError);
    return NextResponse.json(
      { error: "Failed to update season budget" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}