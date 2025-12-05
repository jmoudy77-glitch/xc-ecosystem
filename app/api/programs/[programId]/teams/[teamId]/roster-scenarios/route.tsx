// app/api/programs/[programId]/teams/[teamId]/roster-scenarios/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const MANAGER_ROLES = ["head_coach", "director", "admin"] as const;

type RouteContext = {
  params: {
    programId: string;
    teamId: string;
  };
};

type ViewerResult =
  | {
      ok: true;
      viewerUserId: string;
      role: string | null;
    }
  | {
      ok: false;
      status: number;
      error: string;
    };

async function getViewerAndMembership(
  req: NextRequest,
  programId: string
): Promise<ViewerResult> {
  const { supabase } = supabaseServer(req);

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.warn("[RosterScenarios] auth.getUser error:", authError.message);
  }

  if (!authUser) {
    return { ok: false, status: 401, error: "Not authenticated" };
  }

  const authId = authUser.id;

  // Map auth user -> users row
  const { data: userRow, error: userError } = await supabaseAdmin
    .from("users")
    .select("id, auth_id, email")
    .eq("auth_id", authId)
    .maybeSingle();

  if (userError) {
    console.error("[RosterScenarios] users select error:", userError);
    return {
      ok: false,
      status: 500,
      error: `Failed to load viewer record: ${userError.message}`,
    };
  }

  if (!userRow) {
    return {
      ok: false,
      status: 403,
      error: "User record not found for this account",
    };
  }

  const viewerUserId = userRow.id as string;

  // Check membership & role – same pattern used in other working routes
  const { data: membershipRow, error: membershipError } = await supabaseAdmin
    .from("program_members")
    .select("id, role, program_id")
    .eq("program_id", programId)
    .eq("user_id", viewerUserId)
    .maybeSingle();

  if (membershipError) {
    console.error("[RosterScenarios] membership error:", membershipError);
    return {
      ok: false,
      status: 500,
      error: `Failed to verify program membership: ${membershipError.message}`,
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

  return { ok: true, viewerUserId, role };
}

// GET: list scenarios for this team
export async function GET(req: NextRequest, { params }: RouteContext) {
  const { programId, teamId } = params;

  const viewer = await getViewerAndMembership(req, programId);
  if (!viewer.ok) {
    return NextResponse.json(
      { error: viewer.error },
      { status: viewer.status }
    );
  }

  const { data: rows, error } = await supabaseAdmin
    .from("roster_scenarios")
    .select(
      `
      id,
      program_id,
      team_id,
      name,
      target_season_label,
      target_season_year,
      notes,
      created_at
    `
    )
    .eq("program_id", programId)
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[RosterScenarios] list error:", error);
    // TEMP: surface details so we can debug
    return NextResponse.json(
      {
        error: "Failed to load roster scenarios",
        details: {
          message: error.message,
          code: error.code,
          hint: error.hint,
          details: error.details,
        },
      },
      { status: 500 }
    );
  }

  const scenarios = (rows ?? []).map((row) => ({
    id: row.id as string,
    name: (row.name as string) ?? "Scenario",
    target_season_label: (row.target_season_label as string | null) ?? null,
    target_season_year: (row.target_season_year as number | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    created_at: row.created_at as string,
  }));

  return NextResponse.json({ scenarios }, { status: 200 });
}

// POST: create a new scenario for this team
export async function POST(req: NextRequest, { params }: RouteContext) {
  const { programId, teamId } = params;

  const viewer = await getViewerAndMembership(req, programId);
  if (!viewer.ok) {
    return NextResponse.json(
      { error: viewer.error },
      { status: viewer.status }
    );
  }

  const role = viewer.role;
  const isManager =
    !!role &&
    MANAGER_ROLES.includes(role.toLowerCase() as (typeof MANAGER_ROLES)[number]);

  if (!isManager) {
    return NextResponse.json(
      {
        error: "Only head coaches / admins can create roster scenarios",
      },
      { status: 403 }
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

  const name = (body?.name as string | undefined)?.trim();
  const targetLabel =
    (body?.target_season_label as string | undefined)?.trim() || null;
  const targetYear = body?.target_season_year ?? null;
  const notes =
    (body?.notes as string | undefined)?.trim() || null;

  if (!name) {
    return NextResponse.json(
      { error: "Scenario name is required" },
      { status: 400 }
    );
  }

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("roster_scenarios")
    .insert({
      program_id: programId,
      team_id: teamId,
      name,
      target_season_label: targetLabel,
      target_season_year:
        typeof targetYear === "number" ? targetYear : null,
      notes,
    })
    .select(
      `
      id,
      program_id,
      team_id,
      name,
      target_season_label,
      target_season_year,
      notes,
      created_at
    `
    )
    .single();

  if (insertError) {
    console.error("[RosterScenarios] insert error:", insertError);
    return NextResponse.json(
      { error: "Failed to create roster scenario" },
      { status: 500 }
    );
  }

  const scenario = {
    id: inserted.id as string,
    name: (inserted.name as string) ?? "Scenario",
    target_season_label:
      (inserted.target_season_label as string | null) ?? null,
    target_season_year:
      (inserted.target_season_year as number | null) ?? null,
    notes: (inserted.notes as string | null) ?? null,
    created_at: inserted.created_at as string,
  };

  return NextResponse.json({ scenario }, { status: 201 });
}