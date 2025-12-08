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
};

type Params = {
  params: Promise<{
    programId: string;
    teamId: string;
  }>;
};

export async function GET(req: NextRequest, { params }: Params) {
  const { programId, teamId } = await params;

  try {
    const { supabase } = supabaseServer(req);

    // 1) Load all seasons for this team/program
    const { data: seasonRows, error: seasonsError } = await supabase
      .from("team_seasons")
      .select(
        "id, team_id, program_id, season_label, season_year, start_date, end_date, is_active"
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

    // Prefer explicit is_active flag
    let activeSeason =
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
        status,
        scholarship_amount,
        scholarship_unit,
        athletes:athletes!team_roster_athlete_id_fkey (
          first_name,
          last_name,
          grad_year,
          event_group,
          avatar_url
        )
      `
      )
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
          athlete_event_group: (athlete.event_group as string | null) ?? null,
          athlete_avatar_url: row.athletes?.avatar_url ?? null,
          status: (row.status as string | null) ?? null,
          scholarship_amount: (row.scholarship_amount as number | null) ?? null,
          scholarship_unit: (row.scholarship_unit as string | null) ?? null,
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