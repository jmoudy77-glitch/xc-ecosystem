export type FavoritesUpsertArgs = {
  programId: string;
  sport?: string;
  athleteId: string;
  position?: number;
  pinned?: boolean;
};

export async function favoritesUpsert(supabase: any, args: FavoritesUpsertArgs) {
  const { programId, sport = "xc", athleteId, position = 0, pinned = false } = args;

  const { error } = await supabase.rpc("rpc_recruiting_favorites_upsert_v1", {
    p_program_id: programId,
    p_sport: sport,
    p_athlete_id: athleteId,
    p_position: position,
    p_pinned: pinned,
  });

  if (error) throw new Error(error.message);
}
