import { NextRequest, NextResponse } from "next/server";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const MANAGER_ROLES = ["head_coach", "director", "admin"] as const;

export async function PATCH(
  req: NextRequest,
  context: { params: { programId: string; teamId: string; seasonId: string } }
) {
  const { programId, teamId, seasonId } = context.params;

  try {
    // 1) Auth via Supabase (same helper pattern as server components)
    const supabase = await supabaseServerComponent();

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error("[EventGroupQuotas PATCH] auth error:", authError.message);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authId = authUser.id;

    // 2) Load viewer user row
    const { data: userRow, error: userErr } = await supabaseAdmin
      .from("users")
      .select("id, auth_id")
      .eq("auth_id", authId)
      .maybeSingle();

    if (userErr) {
      console.error("[EventGroupQuotas PATCH] users error:", userErr);
      return NextResponse.json(
        { error: "Failed to load user" },
        { status: 500 }
      );
    }

    if (!userRow) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const viewerUserId = userRow.id as string;

    // 3) Ensure membership in this program and role is manager-level
    const { data: membership, error: membershipErr } = await supabaseAdmin
      .from("program_members")
      .select("id, role, program_id")
      .eq("program_id", programId)
      .eq("user_id", viewerUserId)
      .maybeSingle();

    if (membershipErr) {
      console.error(
        "[EventGroupQuotas PATCH] membership error:",
        membershipErr
      );
      return NextResponse.json(
        { error: "Failed to verify program membership" },
        { status: 500 }
      );
    }

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const actingRole: string = (membership.role as string) ?? "";
    const isManager =
      !!actingRole &&
      MANAGER_ROLES.includes(actingRole.toLowerCase() as (typeof MANAGER_ROLES)[number]);

    if (!isManager) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 4) Parse body and basic validation
    const body = await req.json().catch(() => null);
    const quotas = (body as any)?.quotas as
      | Record<string, number | null>
      | undefined;

    if (!quotas || typeof quotas !== "object") {
      return NextResponse.json(
        { error: "Invalid payload: expected { quotas: Record<string, number | null> }" },
        { status: 400 }
      );
    }

    // Optional: sanitize values (coerce to number|null and drop invalids)
    const sanitized: Record<string, number | null> = {};
    for (const [key, value] of Object.entries(quotas)) {
      if (value === null) {
        sanitized[key] = null;
        continue;
      }
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0) continue;
      sanitized[key] = n;
    }

    // 5) Ensure the season belongs to the given team & program
    const { data: seasonRow, error: seasonErr } = await supabaseAdmin
      .from("team_seasons")
      .select("id, team_id, program_id")
      .eq("id", seasonId)
      .eq("team_id", teamId)
      .eq("program_id", programId)
      .maybeSingle();

    if (seasonErr) {
      console.error("[EventGroupQuotas PATCH] season error:", seasonErr);
      return NextResponse.json(
        { error: "Failed to load season" },
        { status: 500 }
      );
    }

    if (!seasonRow) {
      return NextResponse.json({ error: "Season not found" }, { status: 404 });
    }

    // 6) Persist quotas to team_seasons.event_group_quotas
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from("team_seasons")
      .update({ event_group_quotas: sanitized })
      .eq("id", seasonId)
      .eq("team_id", teamId)
      .select("id, event_group_quotas")
      .maybeSingle();

    if (updateErr) {
      console.error("[EventGroupQuotas PATCH] update error:", updateErr);
      return NextResponse.json(
        { error: "Failed to update event group quotas" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        quotas: updated?.event_group_quotas ?? sanitized,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[EventGroupQuotas PATCH] unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
