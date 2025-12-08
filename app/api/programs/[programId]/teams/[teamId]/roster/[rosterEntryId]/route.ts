import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

// Shape of the PATCH body we expect from the coach panel
type RosterUpdatePayload = {
  status?: string;
  role?: string;
  scholarship_amount?: number;
  scholarship_unit?: string;
  notes?: string;
  scholarship_notes?: string; // optional note to attach to history
};

type ParamsPromise = Promise<{
  programId: string;
  teamId: string;
  rosterEntryId: string;
}>;

export async function PATCH(
  req: NextRequest,
  context: { params: ParamsPromise }
) {
  const { programId, teamId, rosterEntryId } = await context.params;

  const { supabase } = supabaseServer(req);

  // Require an authenticated user – we'll use this for history logging
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { error: "Not authenticated", details: userError?.message },
      { status: 401 }
    );
  }

  let body: RosterUpdatePayload;
  try {
    body = (await req.json()) as RosterUpdatePayload;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const {
    status,
    role,
    scholarship_amount,
    scholarship_unit,
    notes,
    scholarship_notes,
  } = body;

  // Build a partial update object from the fields that are actually present
  const updatePayload: Record<string, any> = {};

  if (typeof status === "string") {
    updatePayload.status = status;
  }
  if (typeof role === "string") {
    updatePayload.role = role;
  }
  if (typeof scholarship_amount === "number") {
    updatePayload.scholarship_amount = scholarship_amount;
  }
  if (typeof scholarship_unit === "string") {
    updatePayload.scholarship_unit = scholarship_unit;
  }
  if (typeof notes === "string") {
    updatePayload.notes = notes;
  }

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json(
      {
        error:
          "No valid fields to update. Expected one of: status, role, scholarship_amount, scholarship_unit, notes.",
      },
      { status: 400 }
    );
  }

  // Fetch the existing roster entry to:
  // - Verify it belongs to this program/team
  // - Capture old scholarship values for history logging
  const { data: existing, error: existingError } = await supabase
    .from("team_roster")
    .select(
      "id, program_id, team_id, team_season_id, athlete_id, status, role, scholarship_amount, scholarship_unit, notes"
    )
    .eq("id", rosterEntryId)
    .eq("program_id", programId)
    .eq("team_id", teamId)
    .single();

  if (existingError || !existing) {
    return NextResponse.json(
      { error: "Roster entry not found", details: existingError?.message },
      { status: 404 }
    );
  }

  // Apply the update, constrained again by program/team for safety
  const { data: updated, error: updateError } = await supabase
    .from("team_roster")
    .update(updatePayload)
    .eq("id", rosterEntryId)
    .eq("program_id", programId)
    .eq("team_id", teamId)
    .select(
      "id, program_id, team_id, team_season_id, athlete_id, status, role, scholarship_amount, scholarship_unit, notes"
    )
    .single();

  if (updateError || !updated) {
    return NextResponse.json(
      { error: "Failed to update roster entry", details: updateError?.message },
      { status: 500 }
    );
  }

  // If scholarship changed, log it to athlete_scholarship_history
  const scholarshipAmountChanged =
    "scholarship_amount" in updatePayload &&
    existing.scholarship_amount !== updated.scholarship_amount;

  const scholarshipUnitChanged =
    "scholarship_unit" in updatePayload &&
    (existing.scholarship_unit || null) !== (updated.scholarship_unit || null);

  if (scholarshipAmountChanged || scholarshipUnitChanged) {
    const { error: historyError } = await supabase
      .from("athlete_scholarship_history")
      .insert({
        team_season_id: updated.team_season_id,
        roster_entry_id: updated.id,
        athlete_id: updated.athlete_id,
        changed_by_user_id: user.id,
        old_amount: existing.scholarship_amount,
        new_amount: updated.scholarship_amount,
        old_unit: existing.scholarship_unit,
        new_unit: updated.scholarship_unit,
        notes: scholarship_notes ?? null,
      });

    if (historyError) {
      // We don't fail the whole request, but we do return a warning
      return NextResponse.json(
        {
          rosterEntry: updated,
          warning:
            "Roster updated, but failed to log scholarship history entry.",
          warning_details: historyError.message,
        },
        { status: 200 }
      );
    }
  }

  return NextResponse.json({ rosterEntry: updated }, { status: 200 });
}