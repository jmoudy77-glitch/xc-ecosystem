"use client";

import Link from "next/link";
import TeamSeasonsClient, {
  type TeamSeasonSummary,
} from "./TeamSeasonsClient";
import TeamToolsPanel from "./TeamToolsPanel";

type TeamManagementShellProps = {
  programId: string;
  teamId: string;
  programName: string;
  teamName: string;
  teamMeta: {
    sport: string;
    gender: string | null;
    level: string | null;
  };
  seasons: TeamSeasonSummary[];
  isManager: boolean;
  activeSeason: TeamSeasonSummary | null;
};

export default function TeamManagementShell({
  programId,
  teamId,
  programName,
  teamName,
  teamMeta,
  seasons,
  isManager,
  activeSeason,
}: TeamManagementShellProps) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6 md:grid md:grid-cols-[minmax(0,2.2fr)_minmax(260px,0.9fr)] md:gap-6">
      {/* Left column: main team content */}
      <div className="relative flex flex-col gap-6">
        {/* Hero / team overview */}
        <section className="rounded-3xl bg-slate-900/70 p-5 shadow-lg ring-1 ring-slate-800 backdrop-blur-sm md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-50">{teamName}</h2>
              <p className="mt-1 text-xs text-slate-400">
                {programName} ·{" "}
                {teamMeta.level ? `${teamMeta.level} ` : ""}
                {teamMeta.gender ? `${teamMeta.gender} ` : ""}
                {teamMeta.sport}
              </p>
            </div>
            {activeSeason && (
              <div className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300 ring-1 ring-emerald-500/30">
                Active season:{" "}
                <span className="font-medium">
                  {activeSeason.season_label}
                  {activeSeason.season_year ? ` ${activeSeason.season_year}` : ""}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Seasons & rosters */}
        <section className="rounded-2xl bg-slate-900/70 p-4 ring-1 ring-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
              Seasons &amp; Rosters
            </h3>
            {isManager && (
              <span className="text-[11px] text-slate-500">Manager access</span>
            )}
          </div>
          <div className="mt-3">
            <TeamSeasonsClient
              programId={programId}
              teamId={teamId}
              teamName={teamName}
              isManager={isManager}
              seasons={seasons}
            />
          </div>
        </section>
      </div>

      {/* Right column: Team tools panel with tabs */}
      <aside className="mt-6 md:mt-0">
        <TeamToolsPanel
          programId={programId}
          teamId={teamId}
          isManager={isManager}
        />
      </aside>
    </main>
  );
}