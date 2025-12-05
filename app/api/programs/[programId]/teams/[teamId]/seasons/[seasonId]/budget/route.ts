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

/**
 * PATCH — Update scholarship budget for a season.
 * Only the HEAD COACH may do this.
 * Logs all changes to season_budget_history.
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { programId, teamId, seasonId } = await params;

  // ──────────────────────────────────────────────
  // 1) Auth
  // ──────────────────────────────────────────────
  const supabase = await supabaseServerComponent();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("[Budget PATCH] auth error:", authError);
  }

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const authId = user.id;

  // ──────────────────────────────────────────────
  // 2) Resolve application users.row
  // ──────────────────────────────────────────────
  const { data: userRow, error: userRowError } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("auth_id", authId)
    .maybeSingle();

  if (userRowError) {
    console.error("[Budget PATCH] load userRow error:", userRowError);
    return NextResponse.json({ error: "Failed to load user record" }, { status: 500 });
  }

  if (!userRow) {
    return NextResponse.json({ error: "User record not found" }, { status: 403 });
  }

  const viewerUserId = userRow.id as string;

  // ──────────────────────────────────────────────
  // 3) Membership + Role check
  // ──────────────────────────────────────────────
  const { data: membership, error: membershipError } = await supabaseAdmin
    .from("program_members")
    .select("role")
    .eq("program_id", programId)
    .eq("user_id", viewerUserId)
    .maybeSingle();

  if (membershipError) {
    console.error("[Budget PATCH] membership error:", membershipError);
    return NextResponse.json({ error: "Failed to load membership" }, { status: 500 });
  }

  if (!membership) {
    return NextResponse.json({ error: "Not a member of this program" }, { status: 403 });
  }

  const role = (membership.role as string | null)?.toLowerCase() ?? null;

  // Head coach ONLY
  if (role !== "head_coach") {
    return NextResponse.json(
      { error: "Only the head coach can edit the scholarship budget." },
      { status: 403 }
    );
  }

  // ──────────────────────────────────────────────
  // 4) Parse body
  // ──────────────────────────────────────────────
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rawEquiv = body?.scholarship_budget_equivalents;
  const rawAmount = body?.scholarship_budget_amount;
  const rawCurrency = body?.scholarship_currency;

  const equiv =
    rawEquiv === "" || rawEquiv === null || rawEquiv === undefined
      ? null
      : Number(rawEquiv);

  const amount =
    rawAmount === "" || rawAmount === null || rawAmount === undefined
      ? null
      : Number(rawAmount);

  const currency =
    typeof rawCurrency === "string" && rawCurrency.trim() !== ""
      ? rawCurrency.trim().toUpperCase()
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

  // ──────────────────────────────────────────────
  // 5) Load current season budget (for history diff)
  // ──────────────────────────────────────────────
  const { data: currentSeason, error: currentSeasonError } = await supabaseAdmin
    .from("team_seasons")
    .select(
      `
      id,
      scholarship_budget_equivalents,
      scholarship_budget_amount,
      scholarship_currency
    `
    )
    .eq("id", seasonId)
    .eq("team_id", teamId)
    .maybeSingle();

  if (currentSeasonError) {
    console.error("[Budget PATCH] load season error:", currentSeasonError);
    return NextResponse.json({ error: "Failed to load season" }, { status: 500 });
  }

  if (!currentSeason) {
    return NextResponse.json({ error: "Season not found" }, { status: 404 });
  }

  const oldEquiv =
    (currentSeason.scholarship_budget_equivalents as number | null) ?? null;
  const oldAmount =
    (currentSeason.scholarship_budget_amount as number | null) ?? null;
  const oldCurrency =
    (currentSeason.scholarship_currency as string | null) ?? "USD";

  // No-change detection
  const unchanged =
    (oldEquiv ?? null) === (equiv ?? null) &&
    (oldAmount ?? null) === (amount ?? null) &&
    oldCurrency === currency;

  if (unchanged) {
    return NextResponse.json({ ok: true, unchanged: true });
  }

  // ──────────────────────────────────────────────
  // 6) Update season budget
  // ──────────────────────────────────────────────
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
    console.error("[Budget PATCH] update error:", updateError);
    return NextResponse.json({ error: "Failed to update budget" }, { status: 500 });
  }

  // ──────────────────────────────────────────────
  // 7) Insert HISTORY event
  // (best-effort — does not block success)
  // ──────────────────────────────────────────────
  const { error: historyError } = await supabaseAdmin
    .from("season_budget_history")
    .insert({
      team_season_id: seasonId,
      changed_by_user_id: viewerUserId,
      old_scholarship_budget_equivalents: oldEquiv,
      new_scholarship_budget_equivalents: equiv,
      old_scholarship_budget_amount: oldAmount,
      new_scholarship_budget_amount: amount,
    });

  if (historyError) {
    console.error("[Budget PATCH] history insert error:", historyError);
    // Do NOT fail request — budget still updated
  }

  // ──────────────────────────────────────────────
  // 8) Done
  // ──────────────────────────────────────────────
  return NextResponse.json({ ok: true });
}