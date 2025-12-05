import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { supabaseServer } from "@/lib/supabaseServer";

const MANAGER_ROLES = ["head_coach", "director", "admin"] as const;

type RouteParams = {
  params: {
    programId: string;
    teamId: string;
    scenarioId: string;
  };
};

async function getViewerUserId(req: NextRequest) {
  const { supabase } = supabaseServer(req);

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.warn("[RosterSandboxEntries] auth.getUser error:", authError.message);
  }

  if (!authUser) {
    return { ok: false as const, status: 401, error: "Not authenticated" };
  }

  const authId = authUser.id;

  const { data: userRow, error: userError } = await supabaseAdmin
    .from("users")
    .select("id, auth_id")
    .eq("auth_id", authId)
    .maybeSingle();

  if (userError) {
    console.error("[RosterSandboxEntries] users select error:", userError);
    return {
      ok: false as const,
      status: 500,
      error: "Failed to load viewer user record",
    };
  }

  if (!userRow) {
    return {
      ok: false as const,
      status: 403,
      error: "User record not found for this account",
    };
  }

  return { ok: true as const, userId: userRow.id as string };
}

async function assertProgramManager(
  req: NextRequest,
  programId: string
) {
  const viewer = await getViewerUserId(req);
  if (!viewer.ok) return viewer;

  const { userId } = viewer;

  const { data: membershipRow, error: membershipError } = await supabaseAdmin
    .from("program_members")
    .select("id, role")
    .eq("program_id", programId)
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipError) {
    console.error("[RosterSandboxEntries] membership error:", membershipError);
    return {
      ok: false as const,
      status: 500,
      error: "Failed to verify program membership",
    };
  }

  if (!membershipRow) {
    return {
      ok: false as const,
      status: 403,
      error: "You are not a member of this program",
    };
  }

  const role = (membershipRow.role as string | null) ?? null;
  const isManager =
    !!role &&
    MANAGER_ROLES.includes(
      role.toLowerCase() as (typeof MANAGER_ROLES)[number]
    );

  if (!isManager) {
    return {
      ok: false as const,
      status: 403,
      error: "Only head coaches / admins can modify roster scenarios",
    };
  }

  return { ok: true as const, userId, role };
}

// POST: add an entry (athlete or recruit) to a scenario
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { programId, teamId, scenarioId } = params;

  const access = await assertProgramManager(req, programId);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const athleteId = (body?.athlete_id as string | undefined) ?? null;
  const programRecruitId =
    (body?.program_recruit_id as string | undefined) ?? null;
  const projectedRole = (body?.projected_role as string | undefined) ?? null;
  const projectedStatus =
    (body?.projected_status as string | undefined) ?? null;
  const projectedClassYear =
    (body?.projected_class_year as number | undefined) ?? null;
  const eventGroup = (body?.event_group as string | undefined) ?? null;
  const notes = (body?.notes as string | undefined) ?? null;

  if (!athleteId && !programRecruitId) {
    return NextResponse.json(
      {
        error:
          "Either athlete_id or program_recruit_id is required for a scenario entry",
      },
      { status: 400 }
    );
  }

  // Optional: verify the scenario belongs to this program/team
  const { data: scenarioRow, error: scenarioError } = await supabaseAdmin
    .from("roster_scenarios")
    .select("id, program_id, team_id")
    .eq("id", scenarioId)
    .maybeSingle();

  if (scenarioError) {
    console.error("[RosterSandboxEntries] scenario lookup error:", scenarioError);
    return NextResponse.json(
      { error: "Failed to load scenario" },
      { status: 500 }
    );
  }

  if (!scenarioRow) {
    return NextResponse.json(
      { error: "Scenario not found" },
      { status: 404 }
    );
  }

  if (
    scenarioRow.program_id !== programId ||
    scenarioRow.team_id !== teamId
  ) {
    return NextResponse.json(
      { error: "Scenario does not belong to this team" },
      { status: 403 }
    );
  }

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("roster_scenario_entries")
    .insert({
      scenario_id: scenarioId,
      athlete_id: athleteId,
      program_recruit_id: programRecruitId,
      projected_role: projectedRole,
      projected_status: projectedStatus,
      projected_class_year: projectedClassYear,
      event_group: eventGroup,
      notes,
    })
    .select(
      `
      id,
      scenario_id,
      athlete_id,
      program_recruit_id,
      projected_role,
      projected_status,
      projected_class_year,
      event_group,
      notes,
      created_at
    `
    )
    .single();

  if (insertError) {
    console.error("[RosterSandboxEntries] insert error:", insertError);
    return NextResponse.json(
      { error: "Failed to add entry to roster scenario" },
      { status: 500 }
    );
  }

  return NextResponse.json({ entry: inserted }, { status: 201 });
}