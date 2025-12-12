// app/api/programs/[programId]/teams/[teamId]/seasons/[seasonId]/roster/add-athlete/route.ts

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type RouteParams = {
  params: Promise<{
    programId: string;
    teamId: string;
    seasonId: string;
  }>;
};

export async function POST(req: Request, { params }: RouteParams) {
  const { programId, teamId, seasonId } = await params;

  try {
    const body = await req.json();

    const firstNameRaw = (body.first_name as string | undefined) ?? "";
    const lastNameRaw = (body.last_name as string | undefined) ?? "";

    const firstName = firstNameRaw.trim();
    const lastName = lastNameRaw.trim();

    const gradYearRaw = body.grad_year as unknown;
    const gradYear =
      typeof gradYearRaw === "number"
        ? gradYearRaw
        : typeof gradYearRaw === "string"
          ? Number(gradYearRaw)
          : null;

    const eventGroupRaw = body.event_group as unknown;
    const eventGroup =
      typeof eventGroupRaw === "string" && eventGroupRaw.trim() !== ""
        ? eventGroupRaw.trim()
        : null;

    const jerseyNumberRaw = body.jersey_number as unknown;
    const jerseyNumber =
      typeof jerseyNumberRaw === "string" && jerseyNumberRaw.trim() !== ""
        ? jerseyNumberRaw.trim()
        : null;

    const status =
      (typeof body.status === "string" && body.status.trim() !== ""
        ? body.status.trim()
        : "active") as string;

    const scholarshipAmountRaw = body.scholarship_amount as unknown;
    const scholarshipAmount =
      typeof scholarshipAmountRaw === "number"
        ? scholarshipAmountRaw
        : typeof scholarshipAmountRaw === "string"
          ? Number(scholarshipAmountRaw)
          : null;

    const scholarshipUnitRaw = body.scholarship_unit as unknown;
    const scholarshipUnit =
      typeof scholarshipUnitRaw === "string" && scholarshipUnitRaw.trim() !== ""
        ? scholarshipUnitRaw.trim()
        : "percent";

    const notesRaw = body.notes as unknown;
    const notes = typeof notesRaw === "string" ? notesRaw.trim() : null;

    const emailRaw = body.email as unknown;
    const email = typeof emailRaw === "string" && emailRaw.trim() !== "" ? emailRaw.trim() : null;

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: "first_name and last_name are required." },
        { status: 400 }
      );
    }

    // athletes.grad_year and athletes.event_group are NOT NULL in our schema
    if (!Number.isFinite(gradYear as number)) {
      return NextResponse.json(
        { error: "grad_year is required and must be a number." },
        { status: 400 }
      );
    }

    if (!eventGroup) {
      return NextResponse.json(
        { error: "event_group is required." },
        { status: 400 }
      );
    }

    if (typeof gradYear === "number" && (gradYear < 1900 || gradYear > 2100)) {
      return NextResponse.json(
        { error: "grad_year must be a valid year." },
        { status: 400 }
      );
    }

    if (typeof scholarshipAmount === "number" && scholarshipAmount < 0) {
      return NextResponse.json(
        { error: "scholarship_amount cannot be negative." },
        { status: 400 }
      );
    }

    // Duplicate protection (season-level): if an athlete with the same identity fields is already
    // on this team season roster, treat this request as idempotent and skip creating anything new.
    // NOTE: We intentionally scope duplicates to the roster (team_season) rather than trying to
    // globally de-dupe athletes without a stable unique identifier.
    const { data: existingAthletes, error: existingAthletesError } = await supabaseAdmin
      .from("athletes")
      .select("id")
      .ilike("first_name", firstName)
      .ilike("last_name", lastName)
      .eq("grad_year", gradYear as number)
      .ilike("event_group", eventGroup);

    if (existingAthletesError) {
      console.error(
        "[add-athlete] athletes precheck select error:",
        existingAthletesError
      );
    }

    const existingAthleteIds = (existingAthletes ?? []).map((a: any) => a.id as string);

    if (existingAthleteIds.length > 0) {
      const { data: existingRoster, error: existingRosterError } = await supabaseAdmin
        .from("team_roster")
        .select("id, athlete_id")
        .eq("team_season_id", seasonId)
        .in("athlete_id", existingAthleteIds)
        .limit(1)
        .maybeSingle();

      if (existingRosterError) {
        console.error(
          "[add-athlete] team_roster precheck select error:",
          existingRosterError
        );
      }

      if (existingRoster) {
        return NextResponse.json(
          {
            status: "skipped",
            reason: "duplicate",
            roster_id: existingRoster.id,
            athlete_id: existingRoster.athlete_id,
          },
          { status: 200 }
        );
      }
    }

    // 1) Create athlete (no user_id, unclaimed)
    const { data: athlete, error: athleteError } = await supabaseAdmin
      .from("athletes")
      .insert({
        first_name: firstName,
        last_name: lastName,
        grad_year: gradYear as number,
        event_group: eventGroup,
        is_claimed: false,
      })
      .select("id")
      .single();

    if (athleteError || !athlete) {
      console.error("[add-athlete] athletes insert error:", athleteError);
      return NextResponse.json(
        {
          error: "Failed to create athlete record.",
          supabase: {
            code: athleteError?.code,
            message: athleteError?.message,
            details: athleteError?.details,
            hint: athleteError?.hint,
          },
        },
        { status: 500 }
      );
    }

    const athleteId = athlete.id as string;

    // 2) Link to program_athletes
    const { error: programAthleteError } = await supabaseAdmin
      .from("program_athletes")
      .upsert(
        {
          program_id: programId,
          athlete_id: athleteId,
          relationship_type: "roster",
          status: "active",
          source: "coach_manual",
        },
        {
          onConflict: "program_id,athlete_id",
          ignoreDuplicates: true,
        }
      );

    if (programAthleteError) {
      console.error(
        "[add-athlete] program_athletes insert error:",
        programAthleteError
      );
      // we don't abort the whole request, but we log it
    }

    // 3) Create team_roster row for this season
    const { data: rosterRow, error: rosterError } = await supabaseAdmin
      .from("team_roster")
      .insert({
        program_id: programId,
        team_id: teamId,
        team_season_id: seasonId,
        athlete_id: athleteId,
        program_recruit_id: null,
        jersey_number: jerseyNumber,
        role: null,
        status,
        depth_order: null,
        notes,
        scholarship_amount: scholarshipAmount,
        scholarship_unit: scholarshipUnit,
        scholarship_notes: notes,
        event_group: eventGroup,
      })
      .select("id")
      .single();

    if (rosterError || !rosterRow) {
      // Idempotency: if the DB unique constraint rejects a duplicate roster entry,
      // return a "skipped" result instead of 500.
      if (rosterError?.code === "23505") {
        const { data: existing, error: existingError } = await supabaseAdmin
          .from("team_roster")
          .select("id")
          .eq("team_season_id", seasonId)
          .eq("athlete_id", athleteId)
          .maybeSingle();

        if (existingError) {
          console.error(
            "[add-athlete] team_roster duplicate lookup error:",
            existingError
          );
        }

        return NextResponse.json(
          {
            status: "skipped",
            reason: "duplicate",
            roster_id: existing?.id ?? null,
            athlete_id: athleteId,
          },
          { status: 200 }
        );
      }

      console.error("[add-athlete] team_roster insert error:", rosterError);
      return NextResponse.json(
        {
          error: "Failed to add athlete to team roster.",
          supabase: {
            code: rosterError?.code,
            message: rosterError?.message,
            details: rosterError?.details,
            hint: rosterError?.hint,
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        status: "inserted",
        roster_id: rosterRow.id,
        athlete_id: athleteId,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[add-athlete] Unexpected error:", err);
    return NextResponse.json(
      { error: err?.message || "Unexpected error." },
      { status: 500 }
    );
  }
}