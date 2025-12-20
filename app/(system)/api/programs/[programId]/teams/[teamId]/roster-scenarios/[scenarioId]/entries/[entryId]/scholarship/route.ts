import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { supabaseServer } from "@/lib/supabaseServer";

const MANAGER_ROLES = ["head_coach", "director", "admin"] as const;

type RouteContext = {
  params: Promise<{
    programId: string;
    teamId: string;
    scenarioId: string;
    entryId: string;
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
    console.warn(
      "[ScenarioEntryScholarship] auth.getUser error:",
      authError.message
    );
  }

  if (!authUser) {
    return { ok: false, status: 401, error: "Not authenticated" };
  }

  const authId = authUser.id;

  // Map auth user -> users row
  const { data: userRow, error: userError } = await supabaseAdmin
    .from("users")
    .select("id, auth_id")
    .eq("auth_id", authId)
    .maybeSingle();

  if (userError) {
    console.error(
      "[ScenarioEntryScholarship] users select error:",
      userError
    );
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

  // Check membership & role
  const { data: membershipRow, error: membershipError } = await supabaseAdmin
    .from("program_members")
    .select("id, role")
    .eq("program_id", programId)
    .eq("user_id", viewerUserId)
    .maybeSingle();

  if (membershipError) {
    console.error(
      "[ScenarioEntryScholarship] membership error:",
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

// PATCH: update scholarship fields on a single scenario entry
export async function PATCH(req: NextRequest, context: RouteContext) {
  const { programId, teamId, scenarioId, entryId } = await context.params;

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
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const scholarshipAmountRaw = body?.scholarship_amount;
  const scholarshipUnitRaw = body?.scholarship_unit;
  const scholarshipNotesRaw = body?.scholarship_notes;

  // Build update payload with only provided fields
  const updatePayload: Record<string, any> = {};

  if (scholarshipAmountRaw !== undefined) {
    if (
      scholarshipAmountRaw === null ||
      scholarshipAmountRaw === "" ||
      Number.isNaN(Number(scholarshipAmountRaw))
    ) {
      updatePayload.scholarship_amount = null;
    } else {
      updatePayload.scholarship_amount = Number(scholarshipAmountRaw);
    }
  }

  if (scholarshipUnitRaw !== undefined) {
    // expect: "equivalency" | "percent" | "amount"
    updatePayload.scholarship_unit = scholarshipUnitRaw;
  }

  if (scholarshipNotesRaw !== undefined) {
    updatePayload.scholarship_notes =
      scholarshipNotesRaw === "" ? null : String(scholarshipNotesRaw);
  }

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json(
      { error: "No scholarship fields provided" },
      { status: 400 }
    );
  }

  // Make sure entry belongs to this scenario + team + program
  const { data: entryRow, error: entryError } = await supabaseAdmin
    .from("roster_scenario_entries")
    .select(
      `
      id,
      scenario_id,
      roster_scenarios!inner (
        id,
        program_id,
        team_id
      )
    `
    )
    .eq("id", entryId)
    .eq("scenario_id", scenarioId)
    .maybeSingle();

  if (entryError) {
    console.error(
      "[ScenarioEntryScholarship] entry lookup error:",
      entryError
    );
    return NextResponse.json(
      { error: "Failed to load scenario entry" },
      { status: 500 }
    );
  }

  if (!entryRow) {
    return NextResponse.json(
      { error: "Scenario entry not found" },
      { status: 404 }
    );
  }

  const scenarioRel = (entryRow as any).roster_scenarios;
  const scenarioRecord = Array.isArray(scenarioRel)
    ? scenarioRel[0]
    : scenarioRel;

  if (
    !scenarioRecord ||
    scenarioRecord.program_id !== programId ||
    scenarioRecord.team_id !== teamId
  ) {
    return NextResponse.json(
      { error: "Scenario entry does not belong to this team/program" },
      { status: 403 }
    );
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("roster_scenario_entries")
    .update(updatePayload)
    .eq("id", entryId)
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
    .single();

  if (updateError) {
    console.error(
      "[ScenarioEntryScholarship] update error:",
      updateError
    );
    return NextResponse.json(
      { error: "Failed to update scholarship values" },
      { status: 500 }
    );
  }

  return NextResponse.json({ entry: updated }, { status: 200 });
}