"use client";

import { useParams } from "next/navigation";
import RosterSandboxClient from "../RosterSandboxClient";

export default function RosterPlanningPage() {
  const params = useParams<{ programId: string; teamId: string }>();
  const programId = params.programId;
  const teamId = params.teamId;

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="rounded-2xl bg-surface-1 p-5 ring-1 ring-border-subtle backdrop-blur-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-[color:var(--text)]">Roster Planning</h1>
            <p className="mt-1 text-[12px] text-muted">
              Create and explore roster scenarios without affecting your official roster.
            </p>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-4 rounded-xl bg-surface-2 p-4 ring-1 ring-border-subtle">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center rounded-md bg-[color:var(--brand-ghost)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--brand)] ring-1 ring-[color:var(--brand-ring)]"
                    title="This is a safe workspace"
                  >
                    Planning mode
                  </span>
                  <span className="text-[11px] font-semibold text-[color:var(--text)]">
                    Safe to experiment
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-muted">
                  Nothing here changes the team’s official roster until you promote a scenario.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-surface-1 px-3 py-2 ring-1 ring-border-subtle">
                  <p className="text-[11px] font-semibold text-[color:var(--text)]">Next step</p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    Open a scenario → mark it Candidate → promote to Active.
                  </p>
                </div>
              </div>
            </div>
          </div>
          {/* TODO: wire isManager from membership/role; kept as true for now */}
          <RosterSandboxClient programId={programId} teamId={teamId} isManager />
        </div>
      </div>
    </div>
  );
}