"use server";

import { cookies } from "next/headers";
import type { ProgramHealthViewModel } from "@/app/ui/program-health/types";
import { supabaseServer } from "@/lib/supabaseServer";

export async function readProgramHealthView(programId: string): Promise<ProgramHealthViewModel> {
  const cookieStore = await cookies();
  const { supabase } = await supabaseServer(cookieStore);

  const [{ data: snapshot }, { data: absences }, { data: capabilityNodes }] = await Promise.all([
    supabase
      .from("program_health_snapshots")
      .select("*")
      .eq("program_id", programId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from("program_health_absences")
      .select("*")
      .eq("program_id", programId)
      .order("created_at", { ascending: false }),

    supabase
      .from("capability_nodes")
      .select("*")
      .eq("program_id", programId)
      .eq("is_active", true)
      .order("name", { ascending: true }),
  ]);

  return {
    snapshot: (snapshot as any) ?? null,
    absences: (absences as any) ?? [],
    capabilityNodes: (capabilityNodes as any) ?? [],
  };
}
