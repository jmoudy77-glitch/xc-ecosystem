import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { supabaseServer } from "@/lib/supabaseServer";

const MANAGER_ROLES = ["head_coach", "director", "admin"] as const;

type RouteContext = {
  params: Promise<{
    programId: string;
    teamId: string;
    seasonId: string;
    rosterEntryId: string;
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
    console.warn("[RosterEntry PATCH] auth.getUser error:", authError.message);
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
    console.error("[RosterEntry PATCH] users select error:", userError);
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
      "[RosterEntry PATCH] membership error:",
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
      error: "Only head coaches / admins can modify the roster",
    };
  }

  return { ok: true, viewerUserId, role };
}

// PATCH: update scholarship fields on a single roster row
export async function PATCH(req: NextRequest, context: RouteContext) {
  const { programId, teamId, seasonId, rosterEntryId } = await context.params;

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

  // Ensure the roster entry belongs to this season/team/program
  const { data: existingRow, error: existingError } = await supabaseAdmin
    .from("team_roster")
    .select(
      `
      id,
      team_season_id,
      team_seasons!inner (
        id,
        team_id,
        teams!inner (
          id,
          program_id
        )
      )
    `
    )
    .eq("id", rosterEntryId)
    .maybeSingle();

  if (existingError) {
    console.error("[RosterEntry PATCH] lookup error:", existingError);
    return NextResponse.json(
      { error: "Failed to load roster entry" },
      { status: 500 }
    );
  }

  if (!existingRow) {
    return NextResponse.json(
      { error: "Roster entry not found" },
      { status: 404 }
    );
  }

  const seasonsRel = (existingRow as any).team_seasons;
  const seasonRecord = Array.isArray(seasonsRel) ? seasonsRel[0] : seasonsRel;

  const teamsRel = seasonRecord?.teams;
  const teamRecord = Array.isArray(teamsRel) ? teamsRel[0] : teamsRel;

  if (
    !seasonRecord ||
    !teamRecord ||
    seasonRecord.id !== seasonId ||
    teamRecord.id !== teamId ||
    teamRecord.program_id !== programId
  ) {
    return NextResponse.json(
      { error: "Roster entry does not belong to this season/team/program" },
      { status: 403 }
    );
  }

  // Build update payload
  const updatePayload: Record<string, any> = {};
  if (rawAmount !== undefined) updatePayload.scholarship_amount = scholarshipAmount;
  if (rawUnit !== undefined) updatePayload.scholarship_unit = scholarshipUnit;
  if (rawNotes !== undefined) updatePayload.scholarship_notes = scholarshipNotes;

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("team_roster")
    .update(updatePayload)
    .eq("id", rosterEntryId)
    .select(
      `
      id,
      team_season_id,
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
    console.error("[RosterEntry PATCH] update error:", updateError);
    return NextResponse.json(
      { error: "Failed to update roster entry" },
      { status: 500 }
    );
  }

  return NextResponse.json({ entry: updated }, { status: 200 });
}