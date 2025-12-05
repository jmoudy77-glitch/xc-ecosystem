import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type RouteParams = {
  params: Promise<{
    programId: string;
    teamId: string;
    seasonId: string;
  }>;
};

// Utility to escape CSV values
function csvEscape(value: any): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(req: Request, ctx: RouteParams) {
  const { programId, teamId, seasonId } = await ctx.params;

  // ================
  // LOAD HISTORY ROWS
  // ================
  const { data: historyRows, error } = await supabaseAdmin
    .from("season_budget_history")
    .select(
      `
        id,
        team_season_id,
        changed_by_user_id,
        old_equiv,
        new_equiv,
        old_amount,
        new_amount,
        notes,
        created_at,
        users:users!changed_by_user_id ( first_name, last_name, email ),
        program_members ( role )
      `
    )
    .eq("team_season_id", seasonId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[CSV Export] Error loading history:", error);
    return NextResponse.json(
      { error: "Failed to load scholarship history." },
      { status: 500 }
    );
  }

  // =============
  // BUILD CSV FILE
  // =============
  const header = [
    "Timestamp",
    "Coach Name",
    "Role",
    "Old Equiv",
    "New Equiv",
    "Old Amount",
    "New Amount",
    "Notes"
  ];

  const rows = (historyRows ?? []).map((h) => {
    const userRec = Array.isArray(h.users) ? h.users[0] : h.users;
    const coach = userRec
      ? `${userRec.first_name ?? ""} ${userRec.last_name ?? ""}`.trim()
      : "Unknown";

    const roleRec = Array.isArray(h.program_members) ? h.program_members[0] : h.program_members;
    const role = roleRec?.role ?? "N/A";

    return [
      new Date(h.created_at).toISOString(),
      coach,
      role,
      h.old_equiv ?? "",
      h.new_equiv ?? "",
      h.old_amount ?? "",
      h.new_amount ?? "",
      h.notes ?? ""
    ].map(csvEscape);
  });

  const csvContent =
    header.join(",") +
    "\n" +
    rows.map((r) => r.join(",")).join("\n");

  // =============
  // RETURN CSV RESPONSE
  // =============
  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="scholarship_history_${seasonId}.csv"`
    }
  });
}