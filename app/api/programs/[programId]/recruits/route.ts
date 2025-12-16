import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const MANAGER_ROLES = ["head_coach", "director", "admin"] as const;

type RouteParams = {
  params: Promise<{
    programId: string;
  }>;
};

async function assertProgramMember(
  req: NextRequest,
  programId: string
): Promise<
  | { ok: true; viewerUserId: string; role: string | null }
  | { ok: false; status: number; error: string }
> {
  const { supabase } = supabaseServer(req);

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.warn("[ProgramRecruits] auth.getUser error:", authError.message);
  }

  if (!authUser) {
    return { ok: false, status: 401, error: "Not authenticated" };
  }

  const authId = authUser.id;

  // Map auth -> users row
  const { data: userRow, error: userError } = await supabaseAdmin
    .from("users")
    .select("id, auth_id, email")
    .eq("auth_id", authId)
    .maybeSingle();

  if (userError) {
    console.error("[ProgramRecruits] users select error:", userError);
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

  // Ensure membership in this program
  const { data: membershipRow, error: membershipError } = await supabaseAdmin
    .from("program_members")
    .select("id, role")
    .eq("program_id", programId)
    .eq("user_id", viewerUserId)
    .maybeSingle();

  if (membershipError) {
    console.error("[ProgramRecruits] membership error:", membershipError);
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

  return { ok: true, viewerUserId, role };
}

// GET /api/programs/[programId]/recruits
export async function GET(req: NextRequest, ctx: RouteParams) {
  const { programId } = await ctx.params;

  const searchParams = req.nextUrl.searchParams;
  const q = searchParams.get("q")?.trim() || null;

  const authCheck = await assertProgramMember(req, programId);
  if (!authCheck.ok) {
    return NextResponse.json(
      { error: authCheck.error },
      { status: authCheck.status }
    );
  }

  // Pull recruits for this program with their athlete + profile info
  // If `q` is present, run a lightweight search used by Scenario Add modal.
  const queryBase = supabaseAdmin
    .from("program_recruits")
    .select(
      `
      id,
      program_id,
      status,
      athletes!program_recruits_athlete_id_fkey ( gender ),
      recruiting_profile:recruiting_profiles!inner (
        id,
        profile_type,
        athlete:athletes!inner (
          id,
          first_name,
          last_name,
          grad_year,
          event_group
        )
      )
    `
    )
    .eq("program_id", programId)
    .order("created_at", { ascending: false });

  const query = q
    ? queryBase
        // Filter against the joined athletes table (the `athlete:athletes!inner` relation)
        .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`, {
          foreignTable: "athletes",
        })
        .limit(25)
    : queryBase;

  const { data: rows, error } = await query;

  if (error) {
    console.error("[ProgramRecruits] select error:", error);
    return NextResponse.json(
      { error: q ? "Failed to search recruits" : "Failed to load recruits" },
      { status: 500 }
    );
  }

  const recruits =
    (rows ?? []).map((row: any) => {
      const rpRel = (row as any).recruiting_profile;
      const rpRecord = Array.isArray(rpRel) ? rpRel[0] : rpRel;

      const athleteRel = rpRecord?.athlete;
      const athleteRecord = Array.isArray(athleteRel)
        ? athleteRel[0]
        : athleteRel;

      const first =
        (athleteRecord?.first_name as string | null | undefined) ?? "";
      const last =
        (athleteRecord?.last_name as string | null | undefined) ?? "";
      const fullName = `${first} ${last}`.trim() || "Athlete";

      const genderRel = (row as any).athletes;
      const genderRecord = Array.isArray(genderRel) ? genderRel[0] : genderRel;
      const gender =
        (genderRecord?.gender as string | null | undefined) ?? null;

      return {
        program_recruit_id: row.id as string,
        athlete_id: (athleteRecord?.id as string | undefined) ?? null,

        // Normalized flat fields (for Quick-add and other UIs)
        first_name:
          (athleteRecord?.first_name as string | null | undefined) ?? "",
        last_name:
          (athleteRecord?.last_name as string | null | undefined) ?? "",
        event_group:
          (athleteRecord?.event_group as string | null | undefined) ?? null,

        // Backward-compatible fields
        full_name: fullName,
        grad_year:
          (athleteRecord?.grad_year as number | null | undefined) ?? null,
        status: (row.status as string | null) ?? null,
        profile_type:
          (rpRecord?.profile_type as string | null | undefined) ?? null,
        gender,
      };
    }) ?? [];

  return NextResponse.json({ recruits }, { status: 200 });
}