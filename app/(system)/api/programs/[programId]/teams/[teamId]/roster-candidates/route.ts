import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const MANAGER_ROLES = ["head_coach", "director", "admin"] as const;

type RouteParams = {
  params: Promise<{
    programId: string;
    teamId: string;
  }>;
};

async function assertProgramManager(
  req: NextRequest,
  programId: string
): Promise<
  | { ok: true; viewerUserId: string; role: string | null }
  | { ok: false; status: number; error: string }
> {
  const { supabase } = await supabaseServer(req);

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.warn("[RosterCandidates] auth.getUser error:", authError.message);
  }

  if (!authUser) {
    return { ok: false, status: 401, error: "Not authenticated" };
  }

  const authId = authUser.id;

  const { data: userRow, error: userError } = await supabaseAdmin
    .from("users")
    .select("id, auth_id")
    .eq("auth_id", authId)
    .maybeSingle();

  if (userError) {
    console.error("[RosterCandidates] users select error:", userError);
    return { ok: false, status: 500, error: "Failed to load viewer record" };
  }

  if (!userRow) {
    return {
      ok: false,
      status: 403,
      error: "User record not found for this account",
    };
  }

  const viewerUserId = userRow.id as string;

  const { data: membershipRow, error: membershipError } = await supabaseAdmin
    .from("program_members")
    .select("id, role")
    .eq("program_id", programId)
    .eq("user_id", viewerUserId)
    .maybeSingle();

  if (membershipError) {
    console.error("[RosterCandidates] membership error:", membershipError);
    return {
      ok: false,
      status: 500,
      error: "Failed to verify program membership",
    };
  }

  if (!membershipRow) {
    return {
      ok: false,
      status: 403,
      error: "You are not a member of this program",
    };
  }

  const role = (membershipRow.role as string | null) ?? null;
  const isManager =
    !!role &&
    MANAGER_ROLES.includes(role.toLowerCase() as (typeof MANAGER_ROLES)[number]);

  if (!isManager) {
    return {
      ok: false,
      status: 403,
      error: "Only head coaches / admins can view roster candidates",
    };
  }

  return { ok: true, viewerUserId, role };
}

// GET: distinct athletes who have ever been on this team's roster
export async function GET(req: NextRequest, ctx: RouteParams) {
  const { programId, teamId } = await ctx.params;

  const authCheck = await assertProgramManager(req, programId);
  if (!authCheck.ok) {
    return NextResponse.json(
      { error: authCheck.error },
      { status: authCheck.status }
    );
  }

  const { data: rows, error } = await supabaseAdmin
    .from("team_roster")
    .select(
      `
      athlete_id,
      athletes!inner (
        id,
        first_name,
        last_name,
        grad_year
      ),
      team_seasons!inner (
        id,
        team_id
      )
    `
    )
    .eq("team_seasons.team_id", teamId);

  if (error) {
    console.error("[RosterCandidates] select error:", error);
    return NextResponse.json(
      { error: "Failed to load roster candidates" },
      { status: 500 }
    );
  }

  const map = new Map<
    string,
    { athlete_id: string; full_name: string; grad_year: number | null }
  >();

  for (const row of rows ?? []) {
    const athleteRel = (row as any).athletes;
    const athleteRecord = Array.isArray(athleteRel) ? athleteRel[0] : athleteRel;

    if (!athleteRecord?.id) continue;

    const athleteId = athleteRecord.id as string;
    const first =
      (athleteRecord.first_name as string | null | undefined) ?? "";
    const last =
      (athleteRecord.last_name as string | null | undefined) ?? "";
    const fullName = `${first} ${last}`.trim() || "Athlete";
    const gradYear =
      (athleteRecord.grad_year as number | null | undefined) ?? null;

    if (!map.has(athleteId)) {
      map.set(athleteId, { athlete_id: athleteId, full_name: fullName, grad_year: gradYear });
    }
  }

  const athletes = Array.from(map.values());

  return NextResponse.json({ athletes }, { status: 200 });
}