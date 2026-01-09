'use server';

import { createClient } from '@/lib/supabase/route';

export type KernelMergeAthletesArgs = {
  programId: string;
  canonicalAthleteId: string;
  sourceAthleteId: string;
  details?: Record<string, any>;
};

export async function kernelMergeAthletes(args: KernelMergeAthletesArgs) {
  const supabase = await createClient();

  const { programId, canonicalAthleteId, sourceAthleteId, details = {} } = args;

  const { data, error } = await supabase.rpc('kernel_merge_athletes_v1', {
    p_program_id: programId,
    p_canonical_athlete_id: canonicalAthleteId,
    p_source_athlete_id: sourceAthleteId,
    p_details: details,
  });

  if (error) throw new Error(`kernel_merge_athletes_v1 failed: ${error.message}`);

  return { canonicalEventId: data as string };
}
