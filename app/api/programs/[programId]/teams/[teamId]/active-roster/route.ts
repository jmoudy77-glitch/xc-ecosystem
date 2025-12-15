export async function PATCH(req: NextRequest, { params }: Params) {
  const { programId, teamId } = await params;

  try {
    const { supabase } = supabaseServer(req);

    // Ensure an auth session exists (prevents confusing 401s from downstream)
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) {
      console.error("[active-roster][PATCH] auth error", authErr);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const {
      roster_entry_id,
      status,
      role,
      depth_order,
      event_group,
      scholarship_amount,
      scholarship_unit,
      scholarship_notes,
      notes,
    } = body || {};

    if (!roster_entry_id) {
      return NextResponse.json({ error: "roster_entry_id is required" }, { status: 400 });
    }

    // Only update fields that are explicitly provided
    const updatePayload: any = {};
    if (status !== undefined) updatePayload.status = status;
    if (role !== undefined) updatePayload.role = role;
    if (depth_order !== undefined) updatePayload.depth_order = depth_order;
    if (event_group !== undefined) updatePayload.event_group = event_group;
    if (scholarship_amount !== undefined) updatePayload.scholarship_amount = scholarship_amount;
    if (scholarship_unit !== undefined) updatePayload.scholarship_unit = scholarship_unit;
    if (scholarship_notes !== undefined) updatePayload.scholarship_notes = scholarship_notes;
    if (notes !== undefined) updatePayload.notes = notes;

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: "No fields provided to update" }, { status: 400 });
    }

    // Update the roster entry
    const { error: updateErr } = await supabase
      .from("team_roster")
      .update(updatePayload)
      .eq("id", roster_entry_id)
      .eq("program_id", programId)
      .eq("team_id", teamId);

    if (updateErr) {
      console.error("[active-roster][PATCH] update error", updateErr);
      return NextResponse.json(
        { error: "Failed to update roster entry" },
        { status: 500 }
      );
    }

    // Fetch the updated roster row joined to athlete fields (normalized shape)
    const { data: row, error: fetchErr } = await supabase
      .from("team_roster")
      .select(
        `
        id,
        athlete_id,
        role,
        status,
        depth_order,
        event_group,
        scholarship_amount,
        scholarship_unit,
        scholarship_notes,
        athletes:athletes!team_roster_athlete_id_fkey (
          first_name,
          last_name,
          grad_year,
          event_group,
          avatar_url
        )
      `
      )
      .eq("program_id", programId)
      .eq("team_id", teamId)
      .eq("id", roster_entry_id)
      .maybeSingle();

    if (fetchErr) {
      console.error("[active-roster][PATCH] fetch error", fetchErr);
      return NextResponse.json(
        { error: "Failed to fetch updated roster entry" },
        { status: 500 }
      );
    }

    const athlete = (row as any)?.athletes ?? {};

    const normalized = row
      ? {
          id: (row as any).id as string,
          athlete_id: (row as any).athlete_id as string,

          athlete_first_name: (athlete.first_name as string) ?? "",
          athlete_last_name: (athlete.last_name as string) ?? "",
          athlete_grad_year: (athlete.grad_year as number | null) ?? null,
          athlete_default_event_group: (athlete.event_group as string | null) ?? null,
          athlete_event_group: (athlete.event_group as string | null) ?? null,
          athlete_avatar_url: (athlete.avatar_url as string | null) ?? null,

          role: ((row as any).role as string | null) ?? null,
          status: ((row as any).status as string | null) ?? null,
          depth_order: ((row as any).depth_order as number | null) ?? null,
          roster_event_group: ((row as any).event_group as string | null) ?? null,
          event_group: ((row as any).event_group as string | null) ?? null,

          scholarship_amount: ((row as any).scholarship_amount as number | null) ?? null,
          scholarship_unit: ((row as any).scholarship_unit as string | null) ?? null,
          scholarship_notes: ((row as any).scholarship_notes as string | null) ?? null,
        }
      : null;

    return NextResponse.json(
      {
        roster_entry: normalized,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[active-roster][PATCH] unexpected error", err);
    return NextResponse.json(
      { error: "Unexpected error updating roster entry" },
      { status: 500 }
    );
  }
}
// app/api/programs/[programId]/teams/[teamId]/active-roster/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type TeamSeasonRow = {
  id: string;
  team_id: string;
  program_id: string;
  season_label: string | null;
  season_year: number | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean | null;
  is_current: boolean | null;
};

type Params = {
  params: Promise<{
    programId: string;
    teamId: string;
  }>;
};

type AddToRosterBody = {
  athlete_id: string;
  role?: string | null;
  status?: string | null;
  depth_order?: number | null;
  event_group?: string | null;
  program_recruit_id?: string | null;
  scholarship_amount?: number | null;
  scholarship_unit?: "percent" | "equivalency" | "amount" | string | null;
  scholarship_notes?: string | null;
  notes?: string | null;
};

export async function GET(req: NextRequest, { params }: Params) {
  const { programId, teamId } = await params;

  try {
    const { supabase } = supabaseServer(req);

    // 1) Load all seasons for this team/program
    const { data: seasonRows, error: seasonsError } = await supabase
      .from("team_seasons")
      .select(
        "id, team_id, program_id, season_label, season_year, start_date, end_date, is_active, is_current"
      )
      .eq("program_id", programId)
      .eq("team_id", teamId)
      .order("season_year", { ascending: false });

    if (seasonsError) {
      console.error("[active-roster] seasonsError", seasonsError);
      return NextResponse.json(
        { error: "Failed to load team seasons" },
        { status: 500 }
      );
    }

    const seasons: TeamSeasonRow[] = (seasonRows ?? []) as TeamSeasonRow[];

    if (seasons.length === 0) {
      return NextResponse.json(
        {
          roster: [],
          season: null,
        },
        { status: 200 }
      );
    }

    // 2) Determine "active or next upcoming" season
    const todayIso = new Date().toISOString().slice(0, 10);

    // Prefer explicit is_current flag (canonical season for tools)
    let activeSeason =
      seasons.find((s) => s.is_current) ??
      // Otherwise, prefer explicit is_active flag
      seasons.find((s) => s.is_active) ??
      // Otherwise, the nearest upcoming season (start_date >= today)
      seasons
        .filter((s) => s.start_date && s.start_date >= todayIso)
        .sort((a, b) => {
          const ad = a.start_date ?? "";
          const bd = b.start_date ?? "";
          return ad.localeCompare(bd);
        })[0] ??
      // Fallback: the most recent by season_year
      seasons[0];

    if (!activeSeason) {
      return NextResponse.json(
        {
          roster: [],
          season: null,
        },
        { status: 200 }
      );
    }

    // 3) Load roster for that season, joined to athletes
    const { data: rosterRows, error: rosterError } = await supabase
      .from("team_roster")
      .select(
        `
        id,
        athlete_id,
        role,
        status,
        depth_order,
        event_group,
        scholarship_amount,
        scholarship_unit,
        scholarship_notes,
        athletes:athletes!team_roster_athlete_id_fkey (
          first_name,
          last_name,
          grad_year,
          event_group,
          avatar_url
        )
      `
      )
      .eq("program_id", programId)
      .eq("team_id", teamId)
      .eq("team_season_id", activeSeason.id)
      .order("last_name", {
        ascending: true,
        foreignTable: "athletes",
      } as any); // TS workaround for foreignTable

    if (rosterError) {
      console.error("[active-roster] rosterError", rosterError);
      return NextResponse.json(
        { error: "Failed to load active roster" },
        { status: 500 }
      );
    }

    const roster =
      rosterRows?.map((row: any) => {
        const athlete = row.athletes ?? {};
        return {
          id: row.id as string,
          athlete_id: row.athlete_id as string,

          athlete_first_name: (athlete.first_name as string) ?? "",
          athlete_last_name: (athlete.last_name as string) ?? "",
          athlete_grad_year: (athlete.grad_year as number | null) ?? null,
          athlete_default_event_group: (athlete.event_group as string | null) ?? null,
          athlete_event_group: (athlete.event_group as string | null) ?? null,
          athlete_avatar_url: row.athletes?.avatar_url ?? null,

          // roster-scoped fields (season-specific)
          role: (row.role as string | null) ?? null,
          status: (row.status as string | null) ?? null,
          depth_order: (row.depth_order as number | null) ?? null,
          roster_event_group: (row.event_group as string | null) ?? null,
          event_group: (row.event_group as string | null) ?? null,

          scholarship_amount: (row.scholarship_amount as number | null) ?? null,
          scholarship_unit: (row.scholarship_unit as string | null) ?? null,
          scholarship_notes: (row.scholarship_notes as string | null) ?? null,
        };
      }) ?? [];

    return NextResponse.json(
      {
        roster,
        season: {
          id: activeSeason.id,
          season_label: activeSeason.season_label,
          season_year: activeSeason.season_year,
          start_date: activeSeason.start_date,
          end_date: activeSeason.end_date,
          is_active: !!activeSeason.is_active,
          is_current: !!activeSeason.is_current,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[active-roster] unexpected error", err);
    return NextResponse.json(
      { error: "Unexpected error loading active roster" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  const { programId, teamId } = await params;

  try {
    const { supabase } = supabaseServer(req);

    // Ensure an auth session exists (prevents confusing 401s from downstream)
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) {
      console.error("[active-roster][POST] auth error", authErr);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: AddToRosterBody;
    try {
      body = (await req.json()) as AddToRosterBody;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const athleteId = body?.athlete_id;
    if (!athleteId) {
      return NextResponse.json({ error: "athlete_id is required" }, { status: 400 });
    }

    // 1) Load all seasons for this team/program
    const { data: seasonRows, error: seasonsError } = await supabase
      .from("team_seasons")
      .select(
        "id, team_id, program_id, season_label, season_year, start_date, end_date, is_active, is_current"
      )
      .eq("program_id", programId)
      .eq("team_id", teamId)
      .order("season_year", { ascending: false });

    if (seasonsError) {
      console.error("[active-roster][POST] seasonsError", seasonsError);
      return NextResponse.json(
        { error: "Failed to load team seasons" },
        { status: 500 }
      );
    }

    const seasons: TeamSeasonRow[] = (seasonRows ?? []) as TeamSeasonRow[];

    if (seasons.length === 0) {
      return NextResponse.json(
        { error: "No seasons found for this team" },
        { status: 400 }
      );
    }

    // 2) Determine "active or next upcoming" season (same logic as GET)
    const todayIso = new Date().toISOString().slice(0, 10);

    const activeSeason =
      seasons.find((s) => s.is_current) ??
      seasons.find((s) => s.is_active) ??
      seasons
        .filter((s) => s.start_date && s.start_date >= todayIso)
        .sort((a, b) => {
          const ad = a.start_date ?? "";
          const bd = b.start_date ?? "";
          return ad.localeCompare(bd);
        })[0] ??
      seasons[0];

    if (!activeSeason) {
      return NextResponse.json(
        { error: "No active season resolved" },
        { status: 400 }
      );
    }

    // 3) Guardrail: prevent duplicate roster entries for the active season
    const { data: existing, error: existingErr } = await supabase
      .from("team_roster")
      .select("id")
      .eq("program_id", programId)
      .eq("team_id", teamId)
      .eq("team_season_id", activeSeason.id)
      .eq("athlete_id", athleteId)
      .maybeSingle<{ id: string }>();

    if (existingErr) {
      console.error("[active-roster][POST] existing check error", existingErr);
      return NextResponse.json(
        { error: "Failed to check active roster" },
        { status: 500 }
      );
    }

    if (existing?.id) {
      return NextResponse.json(
        { error: "Athlete is already on the active roster" },
        { status: 409 }
      );
    }

    const insertPayload: any = {
      program_id: programId,
      team_id: teamId,
      team_season_id: activeSeason.id,
      athlete_id: athleteId,
    };

    if (body.role !== undefined) insertPayload.role = body.role;
    if (body.status !== undefined) insertPayload.status = body.status;
    if (body.depth_order !== undefined) insertPayload.depth_order = body.depth_order;
    if (body.event_group !== undefined) insertPayload.event_group = body.event_group;
    if (body.program_recruit_id !== undefined)
      insertPayload.program_recruit_id = body.program_recruit_id;
    if (body.scholarship_amount !== undefined)
      insertPayload.scholarship_amount = body.scholarship_amount;
    if (body.scholarship_unit !== undefined)
      insertPayload.scholarship_unit = body.scholarship_unit;
    if (body.scholarship_notes !== undefined)
      insertPayload.scholarship_notes = body.scholarship_notes;
    if (body.notes !== undefined) insertPayload.notes = body.notes;

    const { error: insertErr } = await supabase
      .from("team_roster")
      .insert(insertPayload);

    if (insertErr) {
      console.error("[active-roster][POST] insert error", insertErr);
      return NextResponse.json(
        { error: "Failed to add athlete to roster" },
        { status: 500 }
      );
    }

    // 4) Fetch the created/existing roster row joined to athlete fields (normalized shape)
    const { data: row, error: fetchErr } = await supabase
      .from("team_roster")
      .select(
        `
        id,
        athlete_id,
        role,
        status,
        depth_order,
        event_group,
        scholarship_amount,
        scholarship_unit,
        scholarship_notes,
        athletes:athletes!team_roster_athlete_id_fkey (
          first_name,
          last_name,
          grad_year,
          event_group,
          avatar_url
        )
      `
      )
      .eq("program_id", programId)
      .eq("team_id", teamId)
      .eq("team_season_id", activeSeason.id)
      .eq("athlete_id", athleteId)
      .maybeSingle();

    if (fetchErr) {
      console.error("[active-roster][POST] fetch error", fetchErr);
      return NextResponse.json(
        { error: "Added athlete, but failed to fetch roster row" },
        { status: 500 }
      );
    }

    const athlete = (row as any)?.athletes ?? {};

    const normalized = row
      ? {
          id: (row as any).id as string,
          athlete_id: (row as any).athlete_id as string,

          athlete_first_name: (athlete.first_name as string) ?? "",
          athlete_last_name: (athlete.last_name as string) ?? "",
          athlete_grad_year: (athlete.grad_year as number | null) ?? null,
          athlete_default_event_group: (athlete.event_group as string | null) ?? null,
          athlete_event_group: (athlete.event_group as string | null) ?? null,
          athlete_avatar_url: (athlete.avatar_url as string | null) ?? null,

          role: ((row as any).role as string | null) ?? null,
          status: ((row as any).status as string | null) ?? null,
          depth_order: ((row as any).depth_order as number | null) ?? null,
          roster_event_group: ((row as any).event_group as string | null) ?? null,
          event_group: ((row as any).event_group as string | null) ?? null,

          scholarship_amount: ((row as any).scholarship_amount as number | null) ?? null,
          scholarship_unit: ((row as any).scholarship_unit as string | null) ?? null,
          scholarship_notes: ((row as any).scholarship_notes as string | null) ?? null,
        }
      : null;

    return NextResponse.json(
      {
        roster_entry: normalized,
        season: {
          id: activeSeason.id,
          season_label: activeSeason.season_label,
          season_year: activeSeason.season_year,
          start_date: activeSeason.start_date,
          end_date: activeSeason.end_date,
          is_active: !!activeSeason.is_active,
          is_current: !!activeSeason.is_current,
        },
        idempotent: false,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[active-roster][POST] unexpected error", err);
    return NextResponse.json(
      { error: "Unexpected error adding athlete to active roster" },
      { status: 500 }
    );
  }
}