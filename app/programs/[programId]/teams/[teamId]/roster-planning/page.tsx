// app/programs/[programId]/teams/[teamId]/roster-planning/page.tsx
"use client";

import { useParams } from "next/navigation";
import RosterSandboxClient from "../RosterSandboxClient";

export default function RosterPlanningPage() {
  const params = useParams<{ programId: string; teamId: string }>();
  const programId = params.programId;
  const teamId = params.teamId;

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="rounded-2xl bg-slate-900/70 p-5 ring-1 ring-slate-800 backdrop-blur-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-100">Roster Planning</h1>
            <p className="mt-1 text-[12px] text-slate-500">
              Macro planning surface. Scenarios, scholarship what-ifs, retention, transfers.
            </p>
          </div>

          <></>
        </div>

        <div className="mt-5">
          <RosterSandboxClient programId={programId} teamId={teamId} isManager />
        </div>
      </div>
    </div>
  );
}