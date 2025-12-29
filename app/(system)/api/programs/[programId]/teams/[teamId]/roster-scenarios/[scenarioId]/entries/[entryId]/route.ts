import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { supabaseServer } from "@/lib/supabaseServer";

const MANAGER_ROLES = ["head_coach", "director", "admin"] as const;

type RouteParams = {
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
  const { supabase } = await supabaseServer(req);

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.warn("[ScenarioEntry PATCH] auth.getUser error:", authError.message);
  }

  if (!authUser) {
    return { ok: false, status: 401, error: "Not authenticated" };
  }

  const authId = authUser.id;

  // Map auth -> users row
  const { data: userRow, error: userError } = await supabaseAdmin
    .from("users")
    .select("id, auth_id")
    .eq("auth_id", authId)
    .maybeSingle();

  if (userError) {
    console.error("[ScenarioEntry PATCH] users select error:", userError);
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
    console.error("[ScenarioEntry PATCH] membership error:", membershipError);
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

// PATCH: update scholarship on a single scenario entry
export async function PATCH(req: NextRequest, ctx: RouteParams) {
  const { programId, teamId, scenarioId, entryId } = await ctx.params;

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

  const rawAmount = body?.scholarship_amount;
  const rawUnit = (body?.scholarship_unit as string | undefined) ?? null;
  const rawNotes = (body?.scholarship_notes as string | undefined) ?? null;

  // Normalize amount
  let scholarshipAmount: number | null = null;
  if (rawAmount !== null && rawAmount !== undefined && rawAmount !== "") {
    const parsed = Number(rawAmount);
    if (!Number.isFinite(parsed)) {
      return NextResponse.json(
        { error: "scholarship_amount must be a number" },
        { status: 400 }
      );
    }
    scholarshipAmount = parsed;
  }

  // Normalize unit
  let scholarshipUnit: string | null = null;
  if (rawUnit) {
    const normalized = rawUnit.toLowerCase();
    if (!["percent", "amount"].includes(normalized)) {
      return NextResponse.json(
        { error: "scholarship_unit must be 'percent' or 'amount'" },
        { status: 400 }
      );
    }
    scholarshipUnit = normalized;
  }

  const scholarshipNotes =
    rawNotes && rawNotes.trim().length > 0 ? rawNotes.trim() : null;

  // Ensure entry belongs to this scenario/team/program
  const { data: existingRow, error: existingError } = await supabaseAdmin
    .from("roster_scenario_entries")
    .select(
      `
      id,
      scenario_id,
      roster_scenarios!inner (
        id,
        team_id,
        teams!inner (
          id,
          program_id
        )
      )
    `
    )
    .eq("id", entryId)
    .maybeSingle();

  if (existingError) {
    console.error("[ScenarioEntry PATCH] lookup error:", existingError);
    return NextResponse.json(
      { error: "Failed to load scenario entry" },
      { status: 500 }
    );
  }

  if (!existingRow) {
    return NextResponse.json(
      { error: "Scenario entry not found" },
      { status: 404 }
    );
  }

  const scenRel = (existingRow as any).roster_scenarios;
  const scenRecord = Array.isArray(scenRel) ? scenRel[0] : scenRel;

  const teamsRel = scenRecord?.teams;
  const teamRecord = Array.isArray(teamsRel) ? teamsRel[0] : teamsRel;

  if (
    !scenRecord ||
    !teamRecord ||
    scenRecord.id !== scenarioId ||
    teamRecord.id !== teamId ||
    teamRecord.program_id !== programId
  ) {
    return NextResponse.json(
      { error: "Entry does not belong to this scenario/team/program" },
      { status: 403 }
    );
  }

  const updatePayload: Record<string, any> = {};
  if (rawAmount !== undefined) updatePayload.scholarship_amount = scholarshipAmount;
  if (rawUnit !== undefined) updatePayload.scholarship_unit = scholarshipUnit;
  if (rawNotes !== undefined) updatePayload.scholarship_notes = scholarshipNotes;

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
      status,
      role,
      scholarship_amount,
      scholarship_unit,
      scholarship_notes,
      created_at
    `
    )
    .maybeSingle();

  if (updateError) {
    console.error("[ScenarioEntry PATCH] update error:", updateError);
    return NextResponse.json(
      { error: "Failed to update scenario entry" },
      { status: 500 }
    );
  }

  return NextResponse.json({ entry: updated }, { status: 200 });
}