// app/actions/program-health/readProgramHealthA2Sandbox.ts

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { ProgramHealthViewModel } from "./readProgramHealthView";

export type A2PrimaryMappingRow = {
  program_id: string;
  sport: string;
  event_group_key: string;
  slot_id: string;
  primary_athlete_id: string;
};

export type ProgramHealthA2SandboxView = ProgramHealthViewModel & {
  sandbox: {
    horizon: "A2";
    primary_mapping: A2PrimaryMappingRow[];
  };
};

export async function readProgramHealthA2Sandbox(
  programId: string,
  sport: string = "xc"
): Promise<ProgramHealthA2SandboxView> {
  const cookieStore = cookies() as any;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
      },
    }
  );

  // Base PH read (canonical snapshots, unchanged)
  const { data: baseModel, error: baseErr } = await supabase
    .from("program_health_snapshots")
    .select("*")
    .eq("program_id", programId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (baseErr) throw baseErr;

  // PRIMARY-only mapping for A2 sandbox
  const { data: primaryMapping, error: pmErr } = await supabase.rpc(
    "rpc_ph_a2_primary_mapping_v1",
    {
      p_program_id: programId,
      p_sport: sport,
    }
  );

  if (pmErr) throw pmErr;

  return {
    ...baseModel,
    sandbox: {
      horizon: "A2",
      primary_mapping: primaryMapping ?? [],
    },
  } as ProgramHealthA2SandboxView;
}
