// app/programs/[programId]/teams/[teamId]/TeamToolsPanel.tsx
"use client";

import { useEffect, useState } from "react";
import RosterSandboxClient from "./RosterSandboxClient";

export type ActiveRosterRow = {
  id: string;
  athlete_id: string;
  athlete_first_name: string;
  athlete_last_name: string;
  athlete_grad_year: number | null;
  athlete_default_event_group: string | null;
  roster_event_group: string | null;
  athlete_avatar_url: string | null;
  role: string | null;
  status: string | null;
  depth_order: number | null;
  scholarship_amount: number | null;
  scholarship_unit: string | null;
  scholarship_notes: string | null;
};

type TeamToolsPanelProps = {
  programId: string;
  teamId: string;
  isManager: boolean;
  activeContext: "seasons" | "active-roster" | "roster-planning";
  teamBasePath: string;
};

export default function TeamToolsPanel({
  programId,
  teamId,
  isManager,
  activeContext,
  teamBasePath,
}: TeamToolsPanelProps) {

  const isActiveRoster = activeContext === "active-roster";
  const isRosterPlanning = activeContext === "roster-planning";
  const isSeasons = activeContext === "seasons";

  const storageKey = `xc:team:${programId}:${teamId}:toolbox:collapsed`;
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    active_roster_snapshot: true,
    sandbox_scenarios: true,
  });

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") setCollapsed(parsed);
      }
    } catch {
      // ignore
    }
  }, [storageKey]);

  function toggleSection(key: string) {
    setCollapsed((prev) => {
      const next = { ...prev, [key]: !(prev[key] ?? true) };
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-full flex-col rounded-2xl bg-slate-900/80 p-4 ring-1 ring-slate-800">

        {/* Lens content (scrolls; panel frame stays fixed) */}
        <div className="flex-1 overflow-hidden pr-1">
          <div className="h-full overflow-y-auto space-y-4 pr-1">
            {/* Fixed panel header */}
            <div className="pb-2">
              <p className="text-sm font-semibold text-slate-100">Toolbox</p>
              <p className="mt-1 text-[11px] text-slate-500">
                Context-specific tools. Sections are collapsed by default to keep the panel clean.
              </p>
            </div>

            {/* Active Roster Snapshot (not shown while Active Roster is the center work surface) */}
            {!isActiveRoster && (
              <div className="rounded-2xl bg-slate-950/20 ring-1 ring-slate-800">
                <button
                  type="button"
                  onClick={() => toggleSection("active_roster_snapshot")}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2 text-left"
                >
                  <div>
                    <p className="text-[11px] font-semibold text-slate-200">Active Roster Snapshot</p>
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      Group counts for the current team season.
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {collapsed.active_roster_snapshot ? "Show" : "Hide"}
                  </span>
                </button>
                {!collapsed.active_roster_snapshot && (
                  <div className="px-3 pb-3">
                    <ActiveRosterSummary programId={programId} teamId={teamId} />
                  </div>
                )}
              </div>
            )}

            {/* Sandbox Scenarios */}
            <div className="rounded-2xl bg-slate-950/20 ring-1 ring-slate-800">
              <button
                type="button"
                onClick={() => toggleSection("sandbox_scenarios")}
                className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2 text-left"
              >
                <div>
                  <p className="text-[11px] font-semibold text-slate-200">Sandbox Scenarios</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    What-if rosters for scholarships, retention, and transfers.
                  </p>
                </div>
                <span className="text-[10px] font-semibold text-slate-400">
                  {collapsed.sandbox_scenarios ? "Show" : "Hide"}
                </span>
              </button>
              {!collapsed.sandbox_scenarios && (
                <div className="px-3 pb-3">
                  <RosterSandboxClient programId={programId} teamId={teamId} isManager={isManager} />
                </div>
              )}
            </div>

            {/* Micro guidance (non-interactive, no links) */}
            <div className="rounded-2xl bg-slate-950/10 p-3 ring-1 ring-slate-800">
              <p className="text-[10px] text-slate-500">
                {isActiveRoster
                  ? "Active Roster is the current work surface. Use its built-in Quick-add (recruit-pool only)."
                  : "Use the mode switcher above the shell to change work surfaces. This toolbox adapts to the current mode."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



function ActiveRosterSummary({
  programId,
  teamId,
}: Pick<TeamToolsPanelProps, "programId" | "teamId">) {
  const [roster, setRoster] = useState<ActiveRosterRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let isMounted = true;

    async function loadActiveRoster() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/programs/${programId}/teams/${teamId}/active-roster`,
          { method: "GET", credentials: "include" }
        );

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          if (!isMounted) return;
          console.error("[ActiveRosterSummary] failed response", body);
          setError(body.error || "Failed to load active roster");
          setRoster([]);
          return;
        }

        const body = await res.json();
        const rows: ActiveRosterRow[] = body.roster ?? [];
        if (!isMounted) return;
        setRoster(rows);
      } catch (err) {
        console.error("[ActiveRosterSummary] error", err);
        if (!isMounted) return;
        setError("Failed to load active roster");
        setRoster([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadActiveRoster();

    return () => {
      isMounted = false;
    };
  }, [programId, teamId]);

  const getGroupKey = (row: ActiveRosterRow) =>
    row.roster_event_group ?? row.athlete_default_event_group ?? "Unassigned";

  const groupedRoster = roster.reduce<Record<string, ActiveRosterRow[]>>(
    (acc, row) => {
      const key = getGroupKey(row);
      if (!acc[key]) acc[key] = [];
      acc[key].push(row);
      return acc;
    },
    {}
  );

  const groupOrder = Object.keys(groupedRoster).sort((a, b) => {
    if (a === "Unassigned") return 1;
    if (b === "Unassigned") return -1;
    return a.localeCompare(b);
  });

  if (loading) return <p className="text-[11px] text-slate-400">Loading…</p>;
  if (error) return <p className="text-[11px] text-red-400">{error}</p>;
  if (roster.length === 0)
    return <p className="text-[11px] text-slate-500">No active roster yet.</p>;

  return (
    <div className="space-y-2 text-[11px] text-slate-400">
      {groupOrder.map((groupKey) => {
        const rows = groupedRoster[groupKey] ?? [];
        const isCollapsed = collapsedGroups[groupKey] ?? false;

        return (
          <div
            key={groupKey}
            className="rounded-xl bg-slate-950/20 ring-1 ring-slate-800"
          >
            <button
              type="button"
              onClick={() =>
                setCollapsedGroups((prev) => ({
                  ...prev,
                  [groupKey]: !(prev[groupKey] ?? false),
                }))
              }
              className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-300">
                  {groupKey}
                </span>
                <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-slate-300 ring-1 ring-slate-800">
                  {rows.length}
                </span>
              </div>
              <span className="text-[10px] text-slate-500">
                {isCollapsed ? "Show" : "Hide"}
              </span>
            </button>

            {!isCollapsed && (
              <div className="space-y-1 px-3 pb-3">
                {rows.slice(0, 6).map((row) => (
                  <div key={row.id} className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-200">
                      {row.athlete_first_name} {row.athlete_last_name}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {row.athlete_grad_year ? `${row.athlete_grad_year}` : ""}
                    </span>
                  </div>
                ))}
                {rows.length > 6 && (
                  <p className="pt-1 text-[10px] text-slate-600">
                    +{rows.length - 6} more… (see Active Roster work surface)
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}