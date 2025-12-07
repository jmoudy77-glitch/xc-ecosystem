import { NextRequest, NextResponse } from "next/server";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function PATCH(req: NextRequest, context: any) {
  const params = await context.params;
  const { programId, teamId, seasonId, rosterEntryId } = params;

  try {
    // 1) Authenticated user via Supabase
    const supabase = await supabaseServerComponent();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error("[ScholarshipUpdate] auth error", authError);
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2) Resolve internal users.id
    const {
      data: userRow,
      error: userError,
    } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (userError || !userRow) {
      console.error("[ScholarshipUpdate] user lookup error", userError);
      return NextResponse.json(
        { error: "User not found for scholarship update" },
        { status: 403 }
      );
    }

    // 3) Program membership + role check
    const {
      data: membership,
      error: membershipError,
    } = await supabaseAdmin
      .from("program_members")
      .select("role")
      .eq("program_id", programId)
      .eq("user_id", userRow.id)
      .maybeSingle();

    if (membershipError) {
      console.error("[ScholarshipUpdate] membership error", membershipError);
      return NextResponse.json(
        { error: "Failed to verify program membership" },
        { status: 500 }
      );
    }

    const role = (membership?.role as string | null)?.toLowerCase() ?? null;
    if (role !== "head_coach") {
      return NextResponse.json(
        { error: "Only the head coach can edit scholarships." },
        { status: 403 }
      );
    }

    // 4) Load team_seasons to check lock
    const {
      data: teamSeason,
      error: teamSeasonError,
    } = await supabaseAdmin
      .from("team_seasons")
      .select("id, is_locked")
      .eq("id", seasonId)
      .eq("team_id", teamId)
      .maybeSingle();

    if (teamSeasonError) {
      console.error("[ScholarshipUpdate] team_seasons error", teamSeasonError);
      return NextResponse.json(
        { error: "Failed to load team season" },
        { status: 500 }
      );
    }

    if (!teamSeason) {
      return NextResponse.json(
        { error: "Season not found" },
        { status: 404 }
      );
    }

    const isLocked = (teamSeason.is_locked as boolean | null) ?? false;
    if (isLocked) {
      return NextResponse.json(
        {
          error:
            "Season is locked. Scholarships cannot be edited.",
        },
        { status: 403 }
      );
    }

    // 5) Parse body and build update payload
    const body = await req.json();

    const {
      scholarship_amount,
      scholarship_unit,
      scholarship_notes,
    } = body as {
      scholarship_amount?: number | null;
      scholarship_unit?: string | null;
      scholarship_notes?: string | null;
    };

    const updatePayload: Record<string, unknown> = {};
    if (scholarship_amount !== undefined) {
      updatePayload.scholarship_amount = scholarship_amount;
    }
    if (scholarship_unit !== undefined) {
      updatePayload.scholarship_unit = scholarship_unit;
    }
    if (scholarship_notes !== undefined) {
      updatePayload.scholarship_notes = scholarship_notes;
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        { error: "No scholarship fields provided to update." },
        { status: 400 }
      );
    }

    // 6) Update the roster entry's scholarship fields
    // Team roster is the canonical table for season roster entries and scholarships.
    const { error: updateError } = await supabaseAdmin
      .from("team_roster")
      .update(updatePayload)
      .eq("id", rosterEntryId)
      .eq("team_season_id", seasonId)
      .eq("team_id", teamId)
      .eq("program_id", programId);

    if (updateError) {
      console.error("[ScholarshipUpdate] update error", updateError);
      return NextResponse.json(
        { error: "Failed to update scholarship for roster entry" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[ScholarshipUpdate] unexpected error", err);
    return NextResponse.json(
      { error: "Unexpected error updating scholarship" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, context: any) {
  const params = await context.params;
  const { programId, teamId, seasonId, rosterEntryId } = params;

  try {
    // 1) Authenticated user via Supabase
    const supabase = await supabaseServerComponent();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error("[RosterRemove] auth error", authError);
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2) Resolve internal users.id
    const {
      data: userRow,
      error: userError,
    } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (userError || !userRow) {
      console.error("[RosterRemove] user lookup error", userError);
      return NextResponse.json(
        { error: "User not found for roster removal" },
        { status: 403 }
      );
    }

    // 3) Program membership + role check
    const {
      data: membership,
      error: membershipError,
    } = await supabaseAdmin
      .from("program_members")
      .select("role")
      .eq("program_id", programId)
      .eq("user_id", userRow.id)
      .maybeSingle();

    if (membershipError) {
      console.error("[RosterRemove] membership error", membershipError);
      return NextResponse.json(
        { error: "Failed to verify program membership" },
        { status: 500 }
      );
    }

    const role = (membership?.role as string | null)?.toLowerCase() ?? null;
    if (role !== "head_coach") {
      return NextResponse.json(
        { error: "Only the head coach can edit the roster." },
        { status: 403 }
      );
    }

    // 4) Load team_seasons to check lock
    const {
      data: teamSeason,
      error: teamSeasonError,
    } = await supabaseAdmin
      .from("team_seasons")
      .select("id, is_locked")
      .eq("id", seasonId)
      .eq("team_id", teamId)
      .maybeSingle();

    if (teamSeasonError) {
      console.error("[RosterRemove] team_seasons error", teamSeasonError);
      return NextResponse.json(
        { error: "Failed to load team season" },
        { status: 500 }
      );
    }

    if (!teamSeason) {
      return NextResponse.json(
        { error: "Season not found" },
        { status: 404 }
      );
    }

    const isLocked = (teamSeason.is_locked as boolean | null) ?? false;
    if (isLocked) {
      return NextResponse.json(
        {
          error:
            "Season is locked. The roster cannot be edited.",
        },
        { status: 403 }
      );
    }

    // 5) Delete the roster row for this team/season/program
    const { error: deleteError } = await supabaseAdmin
      .from("team_roster")
      .delete()
      .eq("id", rosterEntryId)
      .eq("team_season_id", seasonId)
      .eq("team_id", teamId)
      .eq("program_id", programId);

    if (deleteError) {
      console.error("[RosterRemove] delete error", deleteError);
      return NextResponse.json(
        { error: "Failed to remove athlete from roster" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[RosterRemove] unexpected error", err);
    return NextResponse.json(
      { error: "Unexpected error removing athlete from roster" },
      { status: 500 }
    );
  }
}
