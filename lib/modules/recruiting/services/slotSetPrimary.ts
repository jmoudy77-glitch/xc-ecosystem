export type SlotSetPrimaryArgs = {
  programId: string;
  teamSeasonId: string;
  sport?: string;
  eventGroupKey: string;
  slotId: string;
  primaryAthleteId: string | null;
  athleteType: "returning" | "recruit";
};

export async function slotSetPrimary(supabase: any, args: SlotSetPrimaryArgs) {
  const {
    programId,
    teamSeasonId,
    sport = "xc",
    eventGroupKey,
    slotId,
    primaryAthleteId,
    athleteType,
  } = args;

  const { error } = await supabase.rpc("rpc_recruiting_slot_set_primary_v2", {
    p_program_id: programId,
    p_team_season_id: teamSeasonId,
    p_sport: sport,
    p_event_group_key: eventGroupKey,
    p_slot_id: slotId,
    p_athlete_id: primaryAthleteId,
    p_athlete_type: athleteType,
  });

  if (error) throw new Error(error.message);
}
