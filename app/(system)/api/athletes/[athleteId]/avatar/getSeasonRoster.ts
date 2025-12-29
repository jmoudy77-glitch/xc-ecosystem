import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function getSeasonRoster(seasonId: string) {
  const { data: rosterRows, error: rosterError } = await supabaseAdmin
    .from("team_roster")
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
      created_at,
      athletes (
        id,
        first_name,
        last_name,
        grad_year,
        avatar_url
      )
    `
    )
    .eq("team_season_id", seasonId)
    .order("created_at", { ascending: true });

  if (rosterError) {
    throw rosterError;
  }

  const roster = (rosterRows ?? []).map((row: any) => {
    const athleteRel = (row as any).athletes;
    const athleteRecord = Array.isArray(athleteRel) ? athleteRel[0] : athleteRel;

    const firstName = athleteRecord?.first_name as string | undefined;
    const lastName = athleteRecord?.last_name as string | undefined;
    const fullName =
      [firstName, lastName].filter(Boolean).join(" ") || "Athlete";

    return {
      id: row.id as string,
      teamSeasonId: row.team_season_id as string,
      athleteId: (row.athlete_id as string | null) ?? null,
      programRecruitId: (row.program_recruit_id as string | null) ?? null,
      status: (row.status as string | null) ?? null,
      role: (row.role as string | null) ?? null,

      // Fields expected by SeasonRosterClient
      name: fullName,
      email: null,
      avatarUrl: (athleteRecord?.avatar_url as string | null) ?? null,

      // Extra metadata
      athleteName: fullName,
      gradYear:
        (athleteRecord?.grad_year as number | null | undefined) ?? null,
      scholarshipAmount:
        (row.scholarship_amount as number | null) ?? null,
      scholarshipUnit:
        (row.scholarship_unit as string | null) ?? "percent",
      scholarshipNotes:
        (row.scholarship_notes as string | null) ?? null,
      createdAt: row.created_at as string | null,
    };
  });

  return roster;
}
