"use client";

import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import TeamSeasonsClient, {
  type TeamSeasonSummary,
} from "./TeamSeasonsClient";
import TeamToolsPanel from "./TeamToolsPanel";

type TeamContext = "seasons" | "active-roster" | "roster-planning";

function deriveTeamContext(pathname: string | null | undefined): TeamContext {
  if (!pathname) return "seasons";
  if (pathname.includes("/active-roster")) return "active-roster";
  if (pathname.includes("/roster-planning")) return "roster-planning";
  return "seasons";
}

type TeamToolsContext = TeamContext | "roster-scenario";

function deriveTeamToolsContext(pathname: string | null | undefined): TeamToolsContext {
  if (!pathname) return "seasons";
  if (pathname.includes("/scenarios/")) return "roster-scenario";
  return deriveTeamContext(pathname);
}

function deriveScenarioId(pathname: string | null | undefined): string | undefined {
  if (!pathname) return undefined;
  const marker = "/scenarios/";
  const idx = pathname.indexOf(marker);
  if (idx === -1) return undefined;
  const rest = pathname.slice(idx + marker.length);
  const firstSeg = rest.split("/")[0];
  return firstSeg || undefined;
}

type TeamContextTab = {
  key: TeamContext;
  label: string;
  href: string;
};

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
  children?: ReactNode;
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
  children,
}: TeamManagementShellProps) {
  const needsSeasonSetup = !activeSeason || seasons.length === 0;
  const pathname = usePathname();
  const router = useRouter();
  const teamBasePath = `/programs/${programId}/teams/${teamId}`;
  const isPracticePlanner = !!pathname && pathname.includes("/practice");
  const activeContext = deriveTeamContext(pathname);
  const toolsContext = deriveTeamToolsContext(pathname);
  const scenarioId = deriveScenarioId(pathname);

  const tabs: TeamContextTab[] = [
    { key: "active-roster", label: "Active Roster", href: `${teamBasePath}/active-roster` },
    { key: "roster-planning", label: "Roster Planning", href: `${teamBasePath}/roster-planning` },
    { key: "seasons", label: "Scenarios", href: `${teamBasePath}/scenarios` },
  ];

  const seasonLabel =
    activeSeason?.season_label ??
    // @ts-expect-error fallback if academic_year exists but not typed
    activeSeason?.academic_year ??
    "—";

  return (
    <main
      className={
        needsSeasonSetup
          ? "mx-auto max-w-4xl px-4 py-6"
          : "mx-auto max-w-6xl px-4 pt-2 pb-6 md:h-[calc(100vh-220px)] md:min-h-0 md:overflow-hidden md:flex md:flex-col"
      }
    >
      {needsSeasonSetup ? (
        <div className="flex flex-col gap-6">
          <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-slate-200">
            <h3 className="text-sm font-semibold">Set up your season to unlock team tools</h3>
            <p className="mt-1 text-sm text-amber-100/90">
              Create at least one season and mark it as current. Once a current season is set,
              your roster, practice planning, and other team tools will appear.
            </p>
          </section>

          {children ? (
            children
          ) : (
            <section className="rounded-2xl bg-slate-900/70 p-4 ring-1 ring-slate-800 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                  Seasons &amp; Rosters
                </h3>
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
          )}
        </div>
      ) : (
        <>
          {!isPracticePlanner ? (
            <>
              {/* Team / Season context */}
              <div className="mb-2 hidden items-center gap-2 md:flex">
                <span className="rounded-full bg-slate-900/60 px-3 py-1 text-[11px] font-semibold text-slate-200 ring-1 ring-[var(--nav-border)] backdrop-blur-sm">
                  Team: <span className="text-slate-50">{teamName}</span>
                </span>
                <span className="rounded-full bg-slate-900/60 px-3 py-1 text-[11px] font-semibold text-slate-200 ring-1 ring-[var(--nav-border)] backdrop-blur-sm">
                  Season: <span className="text-slate-50">{seasonLabel}</span>
                </span>
              </div>

              {/* Team mode switcher (tabbed) */}
              <div className="mb-4">
                <div
                  role="tablist"
                  aria-label="Team modes"
                  className="inline-flex rounded-2xl bg-slate-950/60 p-1 ring-1 ring-slate-800 backdrop-blur-sm"
                >
                  {tabs.map((t) => {
                    const isActive = activeContext === t.key;
                    return (
                      <button
                        key={t.key}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        aria-controls={`team-surface-${t.key}`}
                        onClick={() => {
                          if (!isActive) router.replace(t.href);
                        }}
                        className={
                          "select-none rounded-xl px-4 py-2 text-[12px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-sky-500/40 " +
                          (isActive
                            ? "bg-slate-200 text-slate-950 shadow-sm"
                            : "text-slate-200 hover:bg-slate-900/60 hover:text-slate-100")
                        }
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : null}

          {/* Two-column shell */}
          <div
            className={
              isPracticePlanner
                ? "md:flex-1 md:min-h-0 md:overflow-hidden"
                : "md:flex-1 md:min-h-0 md:overflow-hidden md:grid md:grid-cols-[minmax(0,2.2fr)_minmax(260px,0.9fr)] md:gap-6"
            }
          >
            {/* Left column: main team content */}
            <div
              id={`team-surface-${activeContext}`}
              className="relative flex flex-col gap-6 md:h-full md:min-h-0 md:overflow-y-auto md:pr-1"
            >
              {children ? (
                children
              ) : (
                <section className="rounded-2xl bg-slate-900/70 p-4 ring-1 ring-slate-800 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                      Seasons &amp; Rosters
                    </h3>
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
              )}
            </div>

            {!isPracticePlanner ? (
              <aside className="mt-6 md:mt-0 md:h-full md:min-h-0 md:overflow-hidden md:pl-1">
                <TeamToolsPanel
                  programId={programId}
                  teamId={teamId}
                  isManager={isManager}
                  activeContext={toolsContext as any}
                  teamBasePath={teamBasePath}
                  scenarioId={scenarioId}
                />
              </aside>
            ) : null}
          </div>
        </>
      )}
    </main>
  );
}
