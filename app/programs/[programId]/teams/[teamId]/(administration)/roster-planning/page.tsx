// app/programs/[programId]/teams/[teamId]/(administration)/roster-planning/page.tsx

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import RosterSandboxClient from "@/app/programs/[programId]/teams/[teamId]/RosterSandboxClient";

type PersistedContext = {
  teamId?: string | null;
  teamName?: string | null;
  seasonId?: string | null;
  seasonName?: string | null;
  seasonStatus?: string | null;
};

function readTeamSeasonIdFromCookie(programId: string, cookieValue: string | undefined): string | null {
  if (!cookieValue) return null;
  try {
    const decoded = decodeURIComponent(cookieValue);
    const ctx = JSON.parse(decoded) as PersistedContext;
    return typeof ctx?.seasonId === "string" && ctx.seasonId.trim() ? ctx.seasonId.trim() : null;
  } catch {
    return null;
  }
}

function normalizeSport(raw: unknown): "xc" | "tf" | null {
  if (raw === "xc" || raw === "tf") return raw;
  return null;
}

export default async function RosterPlanningPage({
  params,
}: {
  params: { programId: string; teamId: string };
}) {
  const { programId, teamId } = params;

  const cookieStore = (await cookies()) as any;
  const ctxCookie = cookieStore.get(`xc_ctx_${programId}`)?.value as string | undefined;
  const teamSeasonId = readTeamSeasonIdFromCookie(programId, ctxCookie);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name, options) {
          cookieStore.set({ name, value: "", ...options, maxAge: 0 });
        },
      },
    }
  );

  const { data: programRow, error: programErr } = await supabase
    .from("programs")
    .select("sport")
    .eq("id", programId)
    .maybeSingle();

  const sport = programErr ? null : normalizeSport(programRow?.sport);

  return (
    <RosterSandboxClient
      programId={programId}
      teamId={teamId}
      teamSeasonId={teamSeasonId}
      sport={sport}
    />
  );
}
