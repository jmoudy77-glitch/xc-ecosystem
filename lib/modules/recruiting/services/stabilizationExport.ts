export type StabilizationExportArgs = {
  programId: string;
  sport: string;
};

export async function stabilizationExport(supabase: any, args: StabilizationExportArgs) {
  const { programId, sport } = args;

  const { data, error } = await supabase.rpc("rpc_recruiting_stabilization_export_v1", {
    p_program_id: programId,
    p_sport: sport,
  });

  if (error) throw new Error(error.message);
  return data;
}
