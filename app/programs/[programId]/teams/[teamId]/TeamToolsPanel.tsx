// app/programs/[programId]/teams/[teamId]/TeamToolsPanel.tsx
"use client";

import { useEffect, useState } from "react";
import RosterSandboxClient from "./RosterSandboxClient";
import ScenarioEntriesClient from "./scenarios/[scenarioId]/ScenarioEntriesClient";


export const ACTIVE_ROSTER_TOOLS_EVENT = "xc:active-roster:tools";

export type ActiveRosterToolsState = {
  query: string;
  eventGroup: string; // "" means all
  status: string; // "" means all
  sort: "name" | "event_group" | "grad_year" | "scholarship";
  columns: {
    eventGroup: boolean;
    scholarship: boolean;
    gradYear: boolean;
    notesFlag: boolean;
  };
  multiSelect: boolean;
};

type TeamToolsPanelProps = {
  programId: string;
  teamId: string;
  isManager: boolean;
  activeContext: "seasons" | "active-roster" | "roster-planning" | "roster-scenario";
  teamBasePath: string;
  scenarioId?: string;
};

export default function TeamToolsPanel({
  programId,
  teamId,
  isManager,
  activeContext,
  teamBasePath,
  scenarioId,
}: TeamToolsPanelProps) {

  const isActiveRoster = activeContext === "active-roster";
  const isRosterPlanning = activeContext === "roster-planning";
  const isSeasons = activeContext === "seasons";
  const isRosterScenario = activeContext === "roster-scenario";

  const storageKey = `xc:team:${programId}:${teamId}:toolbox:collapsed`;
  const toolsKey = `xc:team:${programId}:${teamId}:activeRoster:tools`;
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    // default: collapsed
    sandbox_scenarios: true,
    scenario_add_to_scenario: false,
    scenario_budget: true,
    scenario_quotas: true,
    scenario_actions: true,

    // Active Roster toolbox modules
    ar_view_filters: true,
    ar_bulk_actions: true,
    ar_export: true,

    // Desired (later)
    ar_data_completeness: true,
    ar_notes_tags: true,
  });

  const defaultActiveRosterTools: ActiveRosterToolsState = {
    query: "",
    eventGroup: "",
    status: "",
    sort: "name",
    columns: {
      eventGroup: true,
      scholarship: true,
      gradYear: true,
      notesFlag: false,
    },
    multiSelect: false,
  };

  const [activeRosterTools, setActiveRosterTools] =
    useState<ActiveRosterToolsState>(defaultActiveRosterTools);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(toolsKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          setActiveRosterTools((prev) => ({ ...prev, ...parsed }));
        }
      }
    } catch {
      // ignore
    }
  }, [toolsKey]);

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

  useEffect(() => {
    if (!isActiveRoster) return;

    try {
      sessionStorage.setItem(toolsKey, JSON.stringify(activeRosterTools));
    } catch {
      // ignore
    }

    try {
      window.dispatchEvent(
        new CustomEvent(ACTIVE_ROSTER_TOOLS_EVENT, { detail: activeRosterTools })
      );
    } catch {
      // ignore
    }
  }, [isActiveRoster, toolsKey, activeRosterTools]);

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
      <div className="flex h-full flex-col rounded-2xl bg-surface-2 p-4 ring-1 ring-subtle">

        {/* Lens content (scrolls; panel frame stays fixed) */}
        <div className="flex-1 overflow-hidden pr-1">
          <div className="h-full overflow-y-auto space-y-4 pr-1">
            {/* Fixed panel header */}
            <div className="pb-2">
              <p className="text-sm font-semibold text">Toolbox</p>
              <p className="mt-1 text-[11px] text-muted">
                Context-specific tools. Sections are collapsed by default to keep the panel clean.
              </p>
            </div>


            {/* Active Roster toolbox (no navigation; support tools only) */}
            {isActiveRoster && (
              <>
                {/* View & Filters */}
                <div className="rounded-2xl bg-surface ring-1 ring-subtle">
                  <button
                    type="button"
                    onClick={() => toggleSection("ar_view_filters")}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2 text-left"
                  >
                    <div>
                      <p className="text-[11px] font-semibold text">View &amp; Filters</p>
                      <p className="mt-0.5 text-[10px] text-muted">
                        Search, filter, and sort the roster work surface.
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold text-muted">
                      {collapsed.ar_view_filters ? "Show" : "Hide"}
                    </span>
                  </button>

                  {!collapsed.ar_view_filters && (
                    <div className="space-y-3 px-3 pb-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                          Search
                        </label>
                        <input
                          value={activeRosterTools.query}
                          onChange={(e) =>
                            setActiveRosterTools((prev) => ({
                              ...prev,
                              query: e.target.value,
                            }))
                          }
                          placeholder="Search name…"
                          className="h-9 w-full rounded-md border border-subtle bg-surface px-2 text-sm"
                        />
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                            Event group
                          </label>
                          <select
                            value={activeRosterTools.eventGroup}
                            onChange={(e) =>
                              setActiveRosterTools((prev) => ({
                                ...prev,
                                eventGroup: e.target.value,
                              }))
                            }
                            className="h-9 w-full rounded-md border border-subtle bg-surface px-2 text-sm"
                          >
                            <option value="">All</option>
                            <option value="distance">Distance</option>
                            <option value="mid-distance">Mid-distance</option>
                            <option value="sprints">Sprints</option>
                            <option value="jumps">Jumps</option>
                            <option value="throws">Throws</option>
                            <option value="unassigned">Unassigned</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                            Status
                          </label>
                          <select
                            value={activeRosterTools.status}
                            onChange={(e) =>
                              setActiveRosterTools((prev) => ({
                                ...prev,
                                status: e.target.value,
                              }))
                            }
                            className="h-9 w-full rounded-md border border-subtle bg-surface px-2 text-sm"
                          >
                            <option value="">All</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="redshirt">Redshirt</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                            Sort
                          </label>
                          <select
                            value={activeRosterTools.sort}
                            onChange={(e) =>
                              setActiveRosterTools((prev) => ({
                                ...prev,
                                sort: e.target.value as ActiveRosterToolsState["sort"],
                              }))
                            }
                            className="h-9 w-full rounded-md border border-subtle bg-surface px-2 text-sm"
                          >
                            <option value="name">Name</option>
                            <option value="event_group">Event group</option>
                            <option value="grad_year">Grad year</option>
                            <option value="scholarship">Scholarship</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                            Columns
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { key: "eventGroup", label: "Event group" },
                              { key: "scholarship", label: "Scholarship" },
                              { key: "gradYear", label: "Grad year" },
                              { key: "notesFlag", label: "Notes flag" },
                            ].map(({ key, label }) => {
                              const pressed =
                                activeRosterTools.columns[
                                  key as keyof ActiveRosterToolsState["columns"]
                                ];
                              return (
                                <button
                                  key={key}
                                  type="button"
                                  aria-pressed={pressed}
                                  onClick={() =>
                                    setActiveRosterTools((prev) => ({
                                      ...prev,
                                      columns: {
                                        ...prev.columns,
                                        [key]: !prev.columns[
                                          key as keyof ActiveRosterToolsState["columns"]
                                        ],
                                      },
                                    }))
                                  }
                                  className="rounded-full bg-surface-2 px-2.5 py-1 text-[10px] font-semibold ring-1 ring-subtle"
                                >
                                  <span className={pressed ? "text" : "text-muted"}>
                                    {label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <p className="text-[10px] text-muted">
                        This toolbox updates the Active Roster surface live (emits a tools event; no navigation).
                      </p>
                    </div>
                  )}
                </div>

                {/* Bulk Actions */}
                <div className="rounded-2xl bg-surface ring-1 ring-subtle">
                  <button
                    type="button"
                    onClick={() => toggleSection("ar_bulk_actions")}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2 text-left"
                  >
                    <div>
                      <p className="text-[11px] font-semibold text">Bulk Actions</p>
                      <p className="mt-0.5 text-[10px] text-muted">
                        Apply changes to multiple athletes at once.
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold text-muted">
                      {collapsed.ar_bulk_actions ? "Show" : "Hide"}
                    </span>
                  </button>

                  {!collapsed.ar_bulk_actions && (
                    <div className="space-y-3 px-3 pb-3">
                      <button
                        type="button"
                        onClick={() =>
                          setActiveRosterTools((prev) => ({
                            ...prev,
                            multiSelect: !prev.multiSelect,
                          }))
                        }
                        className="h-9 w-full rounded-md bg-surface-2 text-sm font-semibold text ring-1 ring-subtle"
                      >
                        {activeRosterTools.multiSelect
                          ? "Exit multi-select mode"
                          : "Enter multi-select mode"}
                      </button>

                      <div className="grid gap-2 md:grid-cols-2">
                        <button
                          type="button"
                          className="h-9 rounded-md bg-surface-2 text-sm font-semibold text ring-1 ring-subtle"
                        >
                          Bulk set event group
                        </button>
                        <button
                          type="button"
                          className="h-9 rounded-md bg-surface-2 text-sm font-semibold text ring-1 ring-subtle"
                        >
                          Bulk set status
                        </button>
                      </div>

                      <div className="grid gap-2 md:grid-cols-2">
                        <button
                          type="button"
                          className="h-9 rounded-md bg-surface-2 text-sm font-semibold text ring-1 ring-subtle"
                        >
                          Archive / remove from roster
                        </button>
                        <button
                          type="button"
                          className="h-9 rounded-md bg-surface-2 text-sm font-semibold text ring-1 ring-subtle"
                        >
                          Export selected (future)
                        </button>
                      </div>

                      <p className="text-[10px] text-muted">
                        Note: scholarship scenario/budget actions remain in Roster Planning.
                      </p>
                    </div>
                  )}
                </div>

                {/* Export / Print */}
                <div className="rounded-2xl bg-surface ring-1 ring-subtle">
                  <button
                    type="button"
                    onClick={() => toggleSection("ar_export")}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2 text-left"
                  >
                    <div>
                      <p className="text-[11px] font-semibold text">Export / Print</p>
                      <p className="mt-0.5 text-[10px] text-muted">
                        Share the roster without leaving this context.
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold text-muted">
                      {collapsed.ar_export ? "Show" : "Hide"}
                    </span>
                  </button>

                  {!collapsed.ar_export && (
                    <div className="grid gap-2 px-3 pb-3">
                      <button
                        type="button"
                        className="h-9 rounded-md bg-surface-2 text-sm font-semibold text ring-1 ring-subtle"
                      >
                        Export CSV (coming soon)
                      </button>
                      <button
                        type="button"
                        className="h-9 rounded-md bg-surface-2 text-sm font-semibold text ring-1 ring-subtle"
                      >
                        Print view (coming soon)
                      </button>
                      <button
                        type="button"
                        className="h-9 rounded-md bg-surface-2 text-sm font-semibold text ring-1 ring-subtle"
                      >
                        Copy roster link (coming soon)
                      </button>
                    </div>
                  )}
                </div>

                {/* Desired: Data Completeness */}
                <div className="rounded-2xl bg-surface ring-1 ring-subtle">
                  <button
                    type="button"
                    onClick={() => toggleSection("ar_data_completeness")}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2 text-left"
                  >
                    <div>
                      <p className="text-[11px] font-semibold text">Data Completeness</p>
                      <p className="mt-0.5 text-[10px] text-muted">
                        Identify missing fields that block decisions.
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold text-muted">
                      {collapsed.ar_data_completeness ? "Show" : "Hide"}
                    </span>
                  </button>

                  {!collapsed.ar_data_completeness && (
                    <div className="space-y-2 px-3 pb-3 text-[11px] text-muted">
                      <p>Coming soon: missing DOB / grad year / event group / scholarship flags.</p>
                      <p className="text-[10px]">
                        This will power &quot;Show only incomplete&quot; filters without navigation.
                      </p>
                    </div>
                  )}
                </div>

                {/* Desired: Notes & Tags */}
                <div className="rounded-2xl bg-surface ring-1 ring-subtle">
                  <button
                    type="button"
                    onClick={() => toggleSection("ar_notes_tags")}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2 text-left"
                  >
                    <div>
                      <p className="text-[11px] font-semibold text">Notes &amp; Tags</p>
                      <p className="mt-0.5 text-[10px] text-muted">
                        Lightweight reminders tied to the roster.
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold text-muted">
                      {collapsed.ar_notes_tags ? "Show" : "Hide"}
                    </span>
                  </button>

                  {!collapsed.ar_notes_tags && (
                    <div className="space-y-2 px-3 pb-3 text-[11px] text-muted">
                      <p>Coming soon: quick tags (injured, academic risk, needs gear) + pinned notes.</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Scenario intake (Roster Scenario only) */}
            {isRosterScenario && (
              <>
                <div className="rounded-2xl bg-surface ring-1 ring-subtle">
                  <button
                    type="button"
                    onClick={() => toggleSection("scenario_add_to_scenario")}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2 text-left"
                  >
                    <div>
                      <p className="text-[11px] font-semibold text">Add to scenario</p>
                      <p className="mt-0.5 text-[10px] text-muted">
                        Recruits and program athletes grouped by event.
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold text-muted">
                      {collapsed.scenario_add_to_scenario ? "Show" : "Hide"}
                    </span>
                  </button>

                  {!collapsed.scenario_add_to_scenario && (
                    <div className="px-3 pb-3">
                      {scenarioId ? (
                        <ScenarioEntriesClient
                          programId={programId}
                          teamId={teamId}
                          scenarioId={scenarioId}
                          isManager={isManager}
                        />
                      ) : (
                        <p className="text-[11px] text-muted">
                          No scenario selected.
                        </p>
                      )}
                    </div>
                  )}
                </div>
                {/* Scenario budget card */}
                <div className="rounded-2xl bg-surface ring-1 ring-subtle">
                  <button
                    type="button"
                    onClick={() => toggleSection("scenario_budget")}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2 text-left"
                  >
                    <div>
                      <p className="text-[11px] font-semibold text">Scenario scholarship budget</p>
                      <p className="mt-0.5 text-[10px] text-muted">
                        Override the season budget for this scenario only.
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold text-muted">
                      {collapsed.scenario_budget ? "Show" : "Hide"}
                    </span>
                  </button>

                  {!collapsed.scenario_budget && (
                    <div className="space-y-3 px-3 pb-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                            Equivalencies
                          </label>
                          <input
                            type="number"
                            inputMode="decimal"
                            placeholder="e.g., 12.6"
                            className="h-9 w-full rounded-md border border-subtle bg-surface px-2 text-sm"
                            disabled
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                            Dollars (optional)
                          </label>
                          <input
                            type="number"
                            inputMode="decimal"
                            placeholder="e.g., 45000"
                            className="h-9 w-full rounded-md border border-subtle bg-surface px-2 text-sm"
                            disabled
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        className="h-9 w-full rounded-md bg-surface-2 text-sm font-semibold text ring-1 ring-subtle opacity-60"
                        disabled
                      >
                        Save scenario budget (coming soon)
                      </button>

                      <button
                        type="button"
                        className="h-9 w-full rounded-md bg-surface-2 text-sm font-semibold text ring-1 ring-subtle opacity-60"
                        disabled
                      >
                        Reset to season defaults (coming soon)
                      </button>

                      <p className="text-[10px] text-muted">
                        Budget overrides will be stored on the scenario (not the season). UI is wired here; save/reset will be enabled after the scenario settings schema + API route exist.
                      </p>
                    </div>
                  )}
                </div>
                {/* Scenario quotas card */}
                <div className="rounded-2xl bg-surface ring-1 ring-subtle">
                  <button
                    type="button"
                    onClick={() => toggleSection("scenario_quotas")}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2 text-left"
                  >
                    <div>
                      <p className="text-[11px] font-semibold text">Scenario event group quotas</p>
                      <p className="mt-0.5 text-[10px] text-muted">
                        Set target headcount by group for this scenario.
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold text-muted">
                      {collapsed.scenario_quotas ? "Show" : "Hide"}
                    </span>
                  </button>

                  {!collapsed.scenario_quotas && (
                    <div className="space-y-3 px-3 pb-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        {[
                          "Distance",
                          "Mid-distance",
                          "Sprints",
                          "Jumps",
                          "Throws",
                        ].map((label) => (
                          <div key={label} className="space-y-1">
                            <label className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                              {label}
                            </label>
                            <input
                              type="number"
                              inputMode="numeric"
                              placeholder="0"
                              className="h-9 w-full rounded-md border border-subtle bg-surface px-2 text-sm"
                              disabled
                            />
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        className="h-9 w-full rounded-md bg-surface-2 text-sm font-semibold text ring-1 ring-subtle opacity-60"
                        disabled
                      >
                        Save scenario quotas (coming soon)
                      </button>

                      <button
                        type="button"
                        className="h-9 w-full rounded-md bg-surface-2 text-sm font-semibold text ring-1 ring-subtle opacity-60"
                        disabled
                      >
                        Reset to season defaults (coming soon)
                      </button>

                      <p className="text-[10px] text-muted">
                        Quota overrides will be stored on the scenario (not the season). UI is wired here; save/reset will be enabled after the scenario settings schema + API route exist.
                      </p>
                    </div>
                  )}
                </div>
                {/* Scenario actions card */}
                <div className="rounded-2xl bg-surface ring-1 ring-subtle">
                  <button
                    type="button"
                    onClick={() => toggleSection("scenario_actions")}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2 text-left"
                  >
                    <div>
                      <p className="text-[11px] font-semibold text">Scenario actions</p>
                      <p className="mt-0.5 text-[10px] text-muted">
                        Duplicate, archive, and other scenario-level actions.
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold text-muted">
                      {collapsed.scenario_actions ? "Show" : "Hide"}
                    </span>
                  </button>

                  {!collapsed.scenario_actions && (
                    <div className="grid gap-2 px-3 pb-3">
                      <button
                        type="button"
                        className="h-9 rounded-md bg-surface-2 text-sm font-semibold text ring-1 ring-subtle opacity-60"
                        disabled
                      >
                        Duplicate scenario (coming soon)
                      </button>
                      <button
                        type="button"
                        className="h-9 rounded-md bg-surface-2 text-sm font-semibold text ring-1 ring-subtle opacity-60"
                        disabled
                      >
                        Archive scenario (coming soon)
                      </button>
                      <p className="text-[10px] text-muted">
                        These are scenario-level actions (reversible). We’ll enable after wiring the scenarios API.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Sandbox Scenarios (Roster Planning only) */}
            {isRosterPlanning && (
              <div className="rounded-2xl bg-surface ring-1 ring-subtle">
                <button
                  type="button"
                  onClick={() => toggleSection("sandbox_scenarios")}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2 text-left"
                >
                  <div>
                    <p className="text-[11px] font-semibold text">Sandbox Scenarios</p>
                    <p className="mt-0.5 text-[10px] text-muted">
                      What-if rosters for scholarships, retention, and transfers.
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold text-muted">
                    {collapsed.sandbox_scenarios ? "Show" : "Hide"}
                  </span>
                </button>
                {!collapsed.sandbox_scenarios && (
                  <div className="px-3 pb-3">
                    <RosterSandboxClient programId={programId} teamId={teamId} isManager={isManager} />
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}