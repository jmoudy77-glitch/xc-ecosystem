// app/programs/[programId]/teams/[teamId]/(administration)/roster-planning/page.tsx

import { cookies } from "next/headers";
import RosterSandboxClient from "@/app/programs/[programId]/teams/[teamId]/RosterSandboxClient";

type PersistedContext = {
  teamId?: string | null;
  teamName?: string | null;
  seasonId?: string | null;
  seasonName?: string | null;
  seasonStatus?: string | null;
};

function readProgramContext(cookieValue: string | undefined): PersistedContext | null {
  if (!cookieValue) return null;
  try {
    const decoded = decodeURIComponent(cookieValue);
    return JSON.parse(decoded) as PersistedContext;
  } catch {
    return null;
  }
}

export default async function RosterPlanningPage({
  params,
}: {
  params: Promise<{ programId: string; teamId: string }>;
}) {
  const { programId, teamId } = await params;

  const cookieStore = (await cookies()) as any;
  const ctxCookie = cookieStore.get(`xc_ctx_${programId}`)?.value as string | undefined;
  const ctx = readProgramContext(ctxCookie);

  const teamSeasonId = typeof ctx?.seasonId === "string" && ctx.seasonId.trim() ? ctx.seasonId.trim() : null;

  return <RosterSandboxClient programId={programId} teamId={teamId} teamSeasonId={teamSeasonId} />;
}
