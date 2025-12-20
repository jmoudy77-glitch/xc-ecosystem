// app/api/programs/[programId]/teams/[teamId]/seasons/[seasonId]/roster/add-athlete/route.ts

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import crypto from "crypto";

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

    // Duplicate identity soft-check (DB-outward):
    // Coach-input model uses a WEAK identity (first+last+grad_year) and returns 409 with candidates
    // for side-by-side resolution when a possible match is found.
    //
    // NOTE: We intentionally do NOT include school or event_group in the identity key (both can change).
    // Event group is still required for insertion, but not for identity.
    let weakKey: string | null = null;

    // Prefer the DB function (created by the identity migration) to ensure the API matches DB logic.
    // Fallback to a deterministic local computation if the function is unavailable (e.g., local dev mismatch).
    const { data: weakKeyData, error: weakKeyError } = await supabaseAdmin.rpc(
      "athlete_identity_key_weak",
      {
        first_name: firstName,
        last_name: lastName,
        grad_year: gradYear as number,
      }
    );

    if (!weakKeyError && typeof (weakKeyData as any) === "string") {
      weakKey = weakKeyData as any as string;
    } else {
      if (weakKeyError) {
        console.warn(
          "[add-athlete] athlete_identity_key_weak RPC unavailable; falling back to local key computation:",
          weakKeyError
        );
      }

      // Fallback: normalize by trimming/lowercasing and hashing.
      // This is only used if the DB helper function is not available.
      const normalized = `${firstName.trim().toLowerCase()}|${lastName
        .trim()
        .toLowerCase()}|${String(gradYear)}`;
      weakKey = crypto.createHash("sha256").update(normalized).digest("hex");
    }

    const { data: existingAthletes, error: existingAthletesError } =
      await supabaseAdmin
        .from("athletes")
        .select(
          "id, first_name, last_name, grad_year, event_group, is_claimed, avatar_url, date_of_birth, created_at"
        )
        .eq("identity_key_weak", weakKey)
        .limit(25);

    if (existingAthletesError) {
      console.error(
        "[add-athlete] athletes weak-identity precheck select error:",
        existingAthletesError
      );
      // If we can't precheck, continue with insertion and let DB constraints/triggers be authoritative.
    }

    const candidates = (existingAthletes ?? []) as any[];

    if (candidates.length > 0) {
      const candidateIds = candidates.map((a) => a.id as string);

      // Check if any candidate is already on this season roster (idempotent "skipped")
      const { data: existingRosterRows, error: existingRosterError } =
        await supabaseAdmin
          .from("team_roster")
          .select("id, athlete_id")
          .eq("team_season_id", seasonId)
          .in("athlete_id", candidateIds);

      if (existingRosterError) {
        console.error(
          "[add-athlete] team_roster weak-identity precheck select error:",
          existingRosterError
        );
      }

      const rosterByAthleteId = new Map<string, string>();
      (existingRosterRows ?? []).forEach((r: any) => {
        rosterByAthleteId.set(r.athlete_id as string, r.id as string);
      });

      // If any existing athlete is already on the roster, treat this as idempotent.
      const firstRosterHit = (existingRosterRows ?? [])[0] as any | undefined;
      if (firstRosterHit) {
        return NextResponse.json(
          {
            status: "skipped",
            reason: "duplicate",
            roster_id: firstRosterHit.id,
            athlete_id: firstRosterHit.athlete_id,
          },
          { status: 200 }
        );
      }

      // Otherwise, return a standardized 409 duplicate payload for side-by-side resolution.
      const candidatesForClient = candidates.map((a) => ({
        athlete_id: a.id,
        first_name: a.first_name,
        last_name: a.last_name,
        grad_year: a.grad_year,
        event_group: a.event_group,
        is_claimed: a.is_claimed,
        avatar_url: a.avatar_url,
        date_of_birth: a.date_of_birth ?? null,
        created_at: a.created_at ?? null,
        already_on_roster: rosterByAthleteId.has(a.id as string),
        match_reason: ["name+grad_year"],
      }));

      return NextResponse.json(
        {
          error: "duplicate_identity",
          message: "Possible existing athlete match found.",
          identity: {
            mode: "weak",
            key: weakKey,
            input: {
              first_name: firstName,
              last_name: lastName,
              grad_year: gradYear as number,
            },
          },
          candidates: candidatesForClient,
          resolver: {
            actions: ["use_existing", "create_new_anyway"],
          },
        },
        { status: 409 }
      );
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