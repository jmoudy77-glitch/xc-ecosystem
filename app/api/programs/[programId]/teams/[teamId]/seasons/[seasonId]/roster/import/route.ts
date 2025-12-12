// app/api/programs/[programId]/teams/[teamId]/seasons/[seasonId]/roster/import/route.ts

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type RouteParams = {
  params: Promise<{
    programId: string;
    teamId: string;
    seasonId: string;
  }>;
};

// This should match (and extend) the ImportRow you’re building in SeasonRosterClient
type NormalizedImportRow = {
  first_name: string;
  last_name: string;
  grad_year?: number | null;
  event_group?: string | null;
  jersey_number?: string | null;
  status?: string | null;
  scholarship_amount?: number | null;
  scholarship_unit?: "percent" | "equivalency" | "amount" | string | null;
  notes?: string | null;
  email?: string | null;
};

type ImportFailure = {
  index: number;
  reason: string;
  row: NormalizedImportRow;
};

export async function POST(req: Request, { params }: RouteParams) {
  const { programId, teamId, seasonId } = await params;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const rows = body?.rows as NormalizedImportRow[] | undefined;

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json(
      { error: "Request must include a non-empty 'rows' array." },
      { status: 400 }
    );
  }

  if (rows.length > 500) {
    return NextResponse.json(
      { error: "Too many rows in a single import (max 500)." },
      { status: 400 }
    );
  }

  // TODO: plug in your real auth + membership checks here.
  // For example: confirm the current user is a program_member with manager rights
  // and that this team_season is not locked. Follow the same pattern you use in
  // /add-athlete and the TeamSeasonPage loader.

  const supabase = supabaseAdmin;

  const successes: number[] = [];
  const failures: ImportFailure[] = [];

  // NOTE: For true DB atomicity, you’ll want to move this logic into a Postgres
  // function and call it once via supabase.rpc(). This v1 keeps all the business
  // rules in one place and uses a single HTTP call, but inserts are still per row.

  for (let index = 0; index < rows.length; index += 1) {
    const raw = rows[index];

    // Basic validation / normalization
    const firstName = (raw.first_name ?? "").trim();
    const lastName = (raw.last_name ?? "").trim();

    if (!firstName || !lastName) {
      failures.push({
        index,
        reason: "Missing first_name or last_name.",
        row: raw,
      });
      continue;
    }

    let gradYear: number | null = null;
    if (raw.grad_year != null) {
      const parsed = Number(raw.grad_year);
      if (!Number.isFinite(parsed) || parsed < 1900 || parsed > 2100) {
        failures.push({
          index,
          reason: "Invalid grad_year value.",
          row: raw,
        });
        continue;
      }
      gradYear = parsed;
    }

    let scholarshipAmount: number | null = null;
    if (raw.scholarship_amount != null) {
      const parsed = Number(raw.scholarship_amount);
      if (!Number.isFinite(parsed) || parsed < 0) {
        failures.push({
          index,
          reason: "Invalid scholarship_amount (must be non-negative number).",
          row: raw,
        });
        continue;
      }
      scholarshipAmount = parsed;
    }

    const scholarshipUnit =
      (raw.scholarship_unit as "percent" | "equivalency" | "amount" | null) ??
      "percent";

    const eventGroup =
      (raw.event_group && raw.event_group.trim()) || null;
    const jerseyNumber =
      (raw.jersey_number && raw.jersey_number.trim()) || null;
    const status = raw.status?.trim() || "active";
    const notes =
      (raw.notes && raw.notes.trim()) || null;

    try {
      // --- 1) Create a basic athlete row ---
      const { data: athleteInsert, error: athleteError } = await supabase
        .from("athletes")
        .insert({
          first_name: firstName,
          last_name: lastName,
          grad_year: gradYear,
          event_group: eventGroup,
          // organization_id left null for now; hook into your org model later if desired
        })
        .select("id")
        .single();

      if (athleteError || !athleteInsert) {
        failures.push({
          index,
          reason:
            athleteError?.message ||
            "Failed to insert athlete.",
          row: raw,
        });
        continue;
      }

      const athleteId = athleteInsert.id as string;

      // --- 2) Create or upsert program_athletes row ---
      const { error: programAthleteError } = await supabase
        .from("program_athletes")
        .insert({
          program_id: programId,
          athlete_id: athleteId,
          relationship_type: "roster", // consistent with add-athlete route
          status,
          source: "bulk_import",
        });

      if (programAthleteError) {
        failures.push({
          index,
          reason:
            programAthleteError.message ||
            "Failed to insert program_athletes row.",
          row: raw,
        });
        continue;
      }

      // --- 3) Insert into team_roster ---
      const { error: rosterError } = await supabase
        .from("team_roster")
        .insert({
          program_id: programId,
          team_id: teamId,
          team_season_id: seasonId,
          athlete_id: athleteId,
          jersey_number: jerseyNumber,
          status,
          event_group: eventGroup,
          scholarship_amount: scholarshipAmount,
          scholarship_unit: scholarshipUnit,
          scholarship_notes: notes,
        });

      if (rosterError) {
        failures.push({
          index,
          reason:
            rosterError.message ||
            "Failed to insert team_roster row.",
          row: raw,
        });
        continue;
      }

      successes.push(index);
    } catch (err: any) {
      failures.push({
        index,
        reason: err?.message || "Unexpected error during import.",
        row: raw,
      });
    }
  }

  return NextResponse.json({
    importedCount: successes.length,
    skippedCount: failures.length,
    failures,
  });
}