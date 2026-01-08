// app/programs/[programId]/recruiting/page.tsx

import RecruitingDiscoveryModalClient from "./RecruitingDiscoveryModalClient";
import RecruitingM1Client from "./RecruitingM1Client";
import { cookies } from "next/headers";

type PageProps = {
  params: Promise<{ programId: string }>;
};

type PersistedContext = {
  teamId?: string | null;
  seasonId?: string | null;
  teamName?: string | null;
  seasonName?: string | null;
  seasonStatus?: string | null;
};

async function readPersistedProgramContext(programId: string): Promise<PersistedContext> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(`xc_ctx_${programId}`)?.value;
    if (!raw) return {};
    const decoded = decodeURIComponent(raw);
    const parsed = JSON.parse(decoded);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as PersistedContext;
  } catch {
    return {};
  }
}

export default async function RecruitingPage({ params }: PageProps) {
  const { programId } = await params;
  const ctx = await readPersistedProgramContext(programId);
  const teamSeasonId = ctx.seasonId ?? null;
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6">
      <div
        data-recruiting-tray
        className="h-full min-h-0 overflow-visible rounded-2xl ring-1 ring-panel panel-muted shadow-elev-3"
      >
        <div className="h-full min-h-0 p-3">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-xl font-semibold">Recruiting</div>
            </div>
            <RecruitingDiscoveryModalClient programId={programId} />
          </div>
          <RecruitingM1Client programId={programId} teamSeasonId={teamSeasonId} />
        </div>
      </div>
    </main>
  );
}
