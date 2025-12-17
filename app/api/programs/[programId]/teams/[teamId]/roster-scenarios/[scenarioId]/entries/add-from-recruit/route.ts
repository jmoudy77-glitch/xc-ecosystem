import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const MANAGER_ROLES = ["head_coach", "director", "admin"] as const;

type RouteParams = {
  params: Promise<{
    programId: string;
    teamId: string;
    scenarioId: string;
  }>;
};

async function assertProgramManager(
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
    console.warn("[Scenario add-from-recruit] auth error:", authError.message);
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
    console.error("[Scenario add-from-recruit] users error:", userError);
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
    console.error(
      "[Scenario add-from-recruit] membership error:",
      membershipError
    );
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
      error: "Only head coaches / admins can modify scenarios",
    };
  }

  return { ok: true, viewerUserId, role };
}

export async function POST(req: NextRequest, ctx: RouteParams) {
  const { programId, teamId, scenarioId } = await ctx.params;

  const authCheck = await assertProgramManager(req, programId);
  if (!authCheck.ok) {
    return NextResponse.json(
      { error: authCheck.error },
      { status: authCheck.status }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const programRecruitId =
    (body?.program_recruit_id as string | undefined) ?? null;
  if (!programRecruitId) {
    return NextResponse.json(
      { error: "program_recruit_id is required" },
      { status: 400 }
    );
  }

  // Ensure scenario belongs to this program/team
  const { data: scenarioRow, error: scenarioError } = await supabaseAdmin
    .from("roster_scenarios")
    .select("id, program_id, team_id")
    .eq("id", scenarioId)
    .maybeSingle();

  if (scenarioError) {
    console.error("[Scenario add-from-recruit] scenario error:", scenarioError);
    return NextResponse.json({ error: "Failed to load scenario" }, { status: 500 });
  }

  if (
    !scenarioRow ||
    scenarioRow.program_id !== programId ||
    scenarioRow.team_id !== teamId
  ) {
    return NextResponse.json(
      { error: "Scenario does not belong to this team/program" },
      { status: 403 }
    );
  }

  // Resolve recruit -> athlete
  const { data: prRow, error: prError } = await supabaseAdmin
    .from("program_recruits")
    .select(
      `
      id,
      program_id,
      recruiting_profile:recruiting_profiles!inner (
        id,
        athlete:athletes!inner (
          id
        )
      )
    `
    )
    .eq("id", programRecruitId)
    .maybeSingle();

  if (prError) {
    console.error(
      "[Scenario add-from-recruit] program_recruits error:",
      prError
    );
    return NextResponse.json(
      { error: "Failed to resolve recruiting record" },
      { status: 500 }
    );
  }

  if (!prRow) {
    return NextResponse.json(
      { error: "Recruiting record not found" },
      { status: 404 }
    );
  }

  if ((prRow.program_id as string) !== programId) {
    return NextResponse.json(
      { error: "Recruit does not belong to this program" },
      { status: 403 }
    );
  }

  const profileRel = (prRow as any).recruiting_profile;
  const profileRecord = Array.isArray(profileRel) ? profileRel[0] : profileRel;
  const athleteRel = profileRecord?.athlete;
  const athleteRecord = Array.isArray(athleteRel) ? athleteRel[0] : athleteRel;

  if (!athleteRecord) {
    return NextResponse.json(
      { error: "Recruiting profile missing athlete" },
      { status: 500 }
    );
  }

  const athleteId = athleteRecord.id as string;

  // Prevent duplicate for same athlete or same program_recruit in this scenario
  const { data: existingRow, error: existingError } = await supabaseAdmin
    .from("roster_scenario_entries")
    .select("id")
    .eq("scenario_id", scenarioId)
    .or(`athlete_id.eq.${athleteId},program_recruit_id.eq.${programRecruitId}`)
    .maybeSingle();

  if (existingError) {
    console.error(
      "[Scenario add-from-recruit] duplicate check error:",
      existingError
    );
    return NextResponse.json(
      { error: "Failed to check existing scenario entry" },
      { status: 500 }
    );
  }

  if (existingRow) {
    return NextResponse.json(
      { error: "This recruit / athlete is already in this scenario" },
      { status: 409 }
    );
  }

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("roster_scenario_entries")
    .insert({
      scenario_id: scenarioId,
      athlete_id: athleteId,
      program_recruit_id: programRecruitId,
    })
    .select(
      `
      id,
      scenario_id,
      athlete_id,
      program_recruit_id,
      scholarship_amount,
      scholarship_unit,
      scholarship_notes,
      created_at
    `
    )
    .maybeSingle();

  if (insertError) {
    console.error("[Scenario add-from-recruit] insert error:", insertError);
    return NextResponse.json(
      { error: "Failed to add recruit to scenario" },
      { status: 500 }
    );
  }

  return NextResponse.json({ entry: inserted }, { status: 201 });
}