// app/programs/[programId]/teams/[teamId]/active-roster/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ACTIVE_ROSTER_TOOLS_EVENT,
  type ActiveRosterToolsState,
} from "../../TeamToolsPanel";
import { useParams } from "next/navigation";
import type React from "react";

type ActiveRosterApiRow = {
  id: string;
  athlete_id: string;
  athlete_first_name: string;
  athlete_last_name: string;
  athlete_grad_year: number | null;
  athlete_avatar_url: string | null;
  status: string | null;
  scholarship_amount: number | null;
  scholarship_unit: string | null;

  // Some builds may return one or more of these; we’ll normalize.
  roster_event_group?: string | null;
  athlete_default_event_group?: string | null;
  athlete_event_group?: string | null;
};

type ActiveRosterApiResponse = {
  roster: ActiveRosterApiRow[];
  season: {
    id: string;
    season_label: string | null;
    season_year: number | null;
    start_date: string | null;
    end_date: string | null;
    is_active: boolean;
  } | null;
  error?: string;
};

type RecruitPoolRow = {
  id: string;
  athlete_id: string | null;
  first_name: string;
  last_name: string;
  grad_year: number | null;
  event_group: string | null;
};

type RecruitPoolResponse = {
  recruits?: any[];
  data?: any[];
  error?: string;
};

export default function ActiveRosterPage() {
  const params = useParams<{ programId: string; teamId: string }>();
  const programId = params.programId;
  const teamId = params.teamId;

  const storageKeyBase = `xc:team:${programId}:${teamId}`;

  // xc:active-roster:tools wiring
  const toolsKey = `xc:team:${programId}:${teamId}:activeRoster:tools`;
  const defaultTools: ActiveRosterToolsState = {
    query: "",
    eventGroup: "",
    status: "",
    sort: "name",
    columns: { eventGroup: true, scholarship: true, gradYear: true, notesFlag: false },
    multiSelect: false,
  };
  const [tools, setTools] = useState<ActiveRosterToolsState>(defaultTools);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [season, setSeason] = useState<ActiveRosterApiResponse["season"]>(null);
  const [roster, setRoster] = useState<ActiveRosterApiRow[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const [selectedAthlete, setSelectedAthlete] = useState<ActiveRosterApiRow | null>(null);

  type AdminDraft = {
    status: string | null;
    event_group: string | null;
    scholarship_amount: number | null;
    scholarship_unit: string | null;
    scholarship_notes: string | null;
    notes: string | null;
  };

  const [isEditingAdmin, setIsEditingAdmin] = useState(false);
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminDraft, setAdminDraft] = useState<AdminDraft>({
    status: null,
    event_group: null,
    scholarship_amount: null,
    scholarship_unit: "percent",
    scholarship_notes: null,
    notes: null,
  });

  useEffect(() => {
    // Reset admin editor whenever a different athlete is selected
    if (!selectedAthlete) return;

    setIsEditingAdmin(false);
    setAdminSaving(false);
    setAdminError(null);

    setAdminDraft({
      status: selectedAthlete.status ?? null,
      event_group:
        selectedAthlete.roster_event_group ??
        selectedAthlete.athlete_default_event_group ??
        selectedAthlete.athlete_event_group ??
        null,
      scholarship_amount:
        typeof selectedAthlete.scholarship_amount === "number"
          ? selectedAthlete.scholarship_amount
          : null,
      scholarship_unit: selectedAthlete.scholarship_unit ?? "percent",
      scholarship_notes: null,
      notes: null,
    });
  }, [selectedAthlete]);

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [recruitLoading, setRecruitLoading] = useState(false);
  const [recruitError, setRecruitError] = useState<string | null>(null);
  const [recruits, setRecruits] = useState<RecruitPoolRow[]>([]);
  const [recruitSearch, setRecruitSearch] = useState<string>("");
  const [recruitCollapsed, setRecruitCollapsed] = useState<Record<string, boolean>>({});
  const [addingAthleteId, setAddingAthleteId] = useState<string | null>(null);

  const normalizeRecruit = (r: any): RecruitPoolRow => {
    const athleteId =
      (r.athlete_id as string | null) ??
      (r.athleteId as string | null) ??
      (r.athlete?.id as string | null) ??
      null;

    return {
      id: (r.id as string) ?? athleteId ?? cryptoRandomKey(),
      athlete_id: athleteId,
      first_name:
        (r.first_name as string) ??
        (r.firstName as string) ??
        (r.athlete?.first_name as string) ??
        (r.athlete?.firstName as string) ??
        "",
      last_name:
        (r.last_name as string) ??
        (r.lastName as string) ??
        (r.athlete?.last_name as string) ??
        (r.athlete?.lastName as string) ??
        "",
      grad_year:
        (r.grad_year as number | null) ??
        (r.gradYear as number | null) ??
        (r.athlete?.grad_year as number | null) ??
        (r.athlete?.gradYear as number | null) ??
        null,
      event_group:
        (r.event_group as string | null) ??
        (r.eventGroup as string | null) ??
        (r.athlete?.event_group as string | null) ??
        (r.athlete?.eventGroup as string | null) ??
        null,
    };
  };

  const loadRecruitPool = useCallback(async () => {
    setRecruitLoading(true);
    setRecruitError(null);

    try {
      // Recruit Pool source (existing endpoint)
      const res = await fetch(`/api/programs/${programId}/recruits`, {
        method: "GET",
        credentials: "include",
      });

      const body: RecruitPoolResponse = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error("[active-roster/page] recruit pool error", body);
        setRecruitError(body.error || "Failed to load recruit pool");
        setRecruits([]);
        return;
      }

      const rows = (body.recruits ?? body.data ?? []) as any[];
      const normalized = rows
        .map(normalizeRecruit)
        .filter((r) => r.athlete_id && r.first_name && r.last_name);

      // Sort for readability
      normalized.sort((a, b) => {
        const al = a.last_name.toLowerCase();
        const bl = b.last_name.toLowerCase();
        if (al !== bl) return al.localeCompare(bl);
        return a.first_name.toLowerCase().localeCompare(b.first_name.toLowerCase());
      });

      setRecruits(normalized);
    } catch (e) {
      console.error("[active-roster/page] recruit pool load error", e);
      setRecruitError("Failed to load recruit pool");
      setRecruits([]);
    } finally {
      setRecruitLoading(false);
    }
  }, [programId]);

  const loadRoster = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/programs/${programId}/teams/${teamId}/active-roster`,
        { method: "GET", credentials: "include" }
      );

      const body: ActiveRosterApiResponse = await res.json().catch(() => ({
        roster: [],
        season: null,
        error: "Failed to parse response",
      }));

      if (!res.ok) {
        setError(body.error || "Failed to load active roster");
        setSeason(null);
        setRoster([]);
        return;
      }

      setSeason(body.season ?? null);
      setRoster(body.roster ?? []);
    } catch (e) {
      console.error("[active-roster/page] load error", e);
      setError("Failed to load active roster");
      setSeason(null);
      setRoster([]);
    } finally {
      setLoading(false);
    }
  }, [programId, teamId]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!mounted) return;
      await loadRoster();
    })();

    return () => {
      mounted = false;
    };
  }, [loadRoster]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(`${storageKeyBase}:activeRoster:collapsed`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") setCollapsed(parsed);
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKeyBase]);

  // tools event wiring
  useEffect(() => {
    // seed from sessionStorage (so refresh works even if the toolbox hasn't emitted yet)
    try {
      const raw = sessionStorage.getItem(toolsKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          setTools((prev) => ({ ...prev, ...parsed }));
        }
      }
    } catch {
      // ignore
    }

    const onTools = (e: Event) => {
      const ce = e as CustomEvent;
      const next = ce?.detail as ActiveRosterToolsState | undefined;
      if (next && typeof next === "object") setTools(next);
    };

    window.addEventListener(ACTIVE_ROSTER_TOOLS_EVENT, onTools as EventListener);

    return () => {
      window.removeEventListener(ACTIVE_ROSTER_TOOLS_EVENT, onTools as EventListener);
    };
  }, [toolsKey]);

  useEffect(() => {
    if (!tools.multiSelect && selectedIds.size) {
      setSelectedIds(new Set());
    }
  }, [tools.multiSelect, selectedIds.size]);

  const handleOpenQuickAdd = useCallback(async () => {
    setQuickAddOpen(true);
    setRecruitSearch("");
    setRecruitCollapsed({});

    try {
      const raw = sessionStorage.getItem(`${storageKeyBase}:quickAdd:collapsed`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") setRecruitCollapsed(parsed);
      }
    } catch {
      // ignore
    }

    // Lazy-load when opened
    if (recruits.length === 0 && !recruitLoading) {
      await loadRecruitPool();
    }
  }, [loadRecruitPool, recruits.length, recruitLoading, storageKeyBase]);

  const handleQuickAdd = useCallback(
    async (athleteId: string) => {
      setAddingAthleteId(athleteId);
      setRecruitError(null);

      try {
        const res = await fetch(
          `/api/programs/${programId}/teams/${teamId}/active-roster`,
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ athleteId }),
          }
        );

        const body = await res.json().catch(() => ({}));

        if (!res.ok) {
          console.error("[active-roster/page] quick-add failed", body);
          if (res.status === 409) {
            setRecruitError("That athlete is already on the active roster.");
          } else {
            setRecruitError(body.error || "Failed to add athlete");
          }
          return;
        }

        // Close and refresh
        setQuickAddOpen(false);
        await loadRoster();
      } catch (e) {
        console.error("[active-roster/page] quick-add error", e);
        setRecruitError("Failed to add athlete");
      } finally {
        setAddingAthleteId(null);
      }
    },
    [programId, teamId, loadRoster]
  );


  const getGroupKey = (row: ActiveRosterApiRow) =>
    row.roster_event_group ??
    row.athlete_default_event_group ??
    row.athlete_event_group ??
    "Unassigned";

  const rosterView = useMemo(() => {
    const q = tools.query.trim().toLowerCase();
    const eventGroupFilter = tools.eventGroup.trim();
    const statusFilter = tools.status.trim();

    let rows = roster.slice();

    if (q) {
      rows = rows.filter((r) => {
        const full = `${r.athlete_first_name} ${r.athlete_last_name}`.toLowerCase();
        const last = (r.athlete_last_name ?? "").toLowerCase();
        const first = (r.athlete_first_name ?? "").toLowerCase();
        const gy = r.athlete_grad_year ? `${r.athlete_grad_year}` : "";
        return full.includes(q) || last.includes(q) || first.includes(q) || gy.includes(q);
      });
    }

    if (eventGroupFilter) {
      rows = rows.filter((r) => getGroupKey(r) === eventGroupFilter);
    }

    if (statusFilter) {
      rows = rows.filter((r) => (r.status ?? "") === statusFilter);
    }

    const sort = tools.sort;
    rows.sort((a, b) => {
      if (sort === "event_group") {
        const ag = getGroupKey(a);
        const bg = getGroupKey(b);
        const c = ag.localeCompare(bg);
        if (c !== 0) return c;
      } else if (sort === "grad_year") {
        const agy = a.athlete_grad_year ?? 9999;
        const bgy = b.athlete_grad_year ?? 9999;
        if (agy !== bgy) return agy - bgy;
      } else if (sort === "scholarship") {
        const as = a.scholarship_amount ?? -1;
        const bs = b.scholarship_amount ?? -1;
        if (as !== bs) return bs - as; // higher first
      }

      // default / tie-breaker: name
      const al = (a.athlete_last_name ?? "").toLowerCase();
      const bl = (b.athlete_last_name ?? "").toLowerCase();
      if (al !== bl) return al.localeCompare(bl);
      return (a.athlete_first_name ?? "").toLowerCase().localeCompare((b.athlete_first_name ?? "").toLowerCase());
    });

    return rows;
  }, [roster, tools.query, tools.eventGroup, tools.status, tools.sort]);

  const grouped = useMemo(() => {
    const acc: Record<string, ActiveRosterApiRow[]> = {};
    for (const r of rosterView) {
      const k = getGroupKey(r);
      if (!acc[k]) acc[k] = [];
      acc[k].push(r);
    }
    return acc;
  }, [rosterView]);

  const groupOrder = useMemo(() => {
    return Object.keys(grouped).sort((a, b) => {
      if (a === "Unassigned") return 1;
      if (b === "Unassigned") return -1;
      return a.localeCompare(b);
    });
  }, [grouped]);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="rounded-2xl bg-surface-2 p-5 ring-1 ring-subtle backdrop-blur-sm text-[color:var(--text)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-lg font-semibold">Active Roster</h1>
            <p className="mt-1 text-[12px] text-muted">
              Work surface for the current team season roster.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted">
              {season ? (
                <span className="rounded-full bg-surface-1 px-3 py-1 ring-1 ring-subtle">
                  Season:{" "}
                  <span className="font-semibold text-[color:var(--text)]">
                    {season.season_label ?? "Season"}
                    {season.season_year ? ` ${season.season_year}` : ""}
                  </span>
                </span>
              ) : (
                <span className="rounded-full bg-surface-1 px-3 py-1 ring-1 ring-subtle">
                  No season detected yet
                </span>
              )}
              <span className="rounded-full bg-surface-1 px-3 py-1 ring-1 ring-subtle">
                Athletes:{" "}
                <span className="font-semibold text-[color:var(--text)]">{rosterView.length}</span>
                {rosterView.length !== roster.length ? (
                  <span className="ml-1 text-[10px] text-subtle">/ {roster.length}</span>
                ) : null}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            <button
              type="button"
              disabled={!season?.is_active}
              className={
                "inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-[11px] font-semibold transition " +
                (season?.is_active
                  ? "border border-subtle bg-surface-1 hover:bg-surface-2"
                  : "cursor-not-allowed border border-subtle bg-surface-2 text-muted")
              }
              onClick={handleOpenQuickAdd}
            >
              Quick-add Athlete
            </button>
            {!season?.is_active && (
              <p className="mt-1 text-[10px] text-muted">
                Roster is in draft. Finalize roster planning to enable active roster tools.
              </p>
            )}
          </div>
        </div>

        <div className="mt-5">
          {loading ? (
            <p className="text-[12px] text-muted">Loading…</p>
          ) : error ? (
            <p className="text-[12px] text-red-400">{error}</p>
          ) : roster.length === 0 ? (
            <div className="rounded-xl bg-surface-1 p-4 ring-1 ring-subtle">
              <p className="text-[12px] text-muted">
                No athletes on the active roster yet.
              </p>
              <p className="mt-2 text-[11px] text-subtle">
                Use Quick-add to pull from the recruit pool and add athletes to the active season roster.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {groupOrder.map((groupKey) => {
                const rows = grouped[groupKey] ?? [];
                const isCollapsed = collapsed[groupKey] ?? false;

                return (
                  <div
                    key={groupKey}
                    className="rounded-xl bg-surface-1 ring-1 ring-subtle"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setCollapsed((prev) => {
                          const next = { ...prev, [groupKey]: !(prev[groupKey] ?? false) };
                          try {
                            sessionStorage.setItem(
                              `${storageKeyBase}:activeRoster:collapsed`,
                              JSON.stringify(next)
                            );
                          } catch {
                            // ignore
                          }
                          return next;
                        })
                      }
                      className="flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--text)]">
                          {groupKey}
                        </span>
                        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-muted ring-1 ring-subtle">
                          {rows.length}
                        </span>
                      </div>
                      <span className="text-[10px] text-subtle">
                        {isCollapsed ? "Show" : "Hide"}
                      </span>
                    </button>

                    {!isCollapsed && (
                      <div className="divide-y border-subtle/0 [--tw-divide-opacity:1] divide-[color:var(--border)]">
                        {rows.map((r) => (
                          <div
                            key={r.id}
                            className={
                              "flex w-full flex-col gap-1 px-4 py-3 text-left transition " +
                              (selectedAthlete?.id === r.id
                                ? "border-l-2 border-sky-500 bg-surface-2"
                                : "border-l-2 border-transparent hover:bg-surface-2")
                            }
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                {tools.multiSelect ? (
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4 accent-[color:var(--brand)]"
                                    checked={selectedIds.has(r.id)}
                                    onChange={() =>
                                      setSelectedIds((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(r.id)) next.delete(r.id);
                                        else next.add(r.id);
                                        return next;
                                      })
                                    }
                                  />
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() => setSelectedAthlete(r)}
                                  className="text-[12px] font-semibold"
                                >
                                  {r.athlete_first_name} {r.athlete_last_name}
                                </button>
                              </div>

                              {tools.columns.gradYear ? (
                                <span className="text-[11px] text-subtle">
                                  {r.athlete_grad_year ? `Grad ${r.athlete_grad_year}` : ""}
                                </span>
                              ) : null}
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-[10px] text-subtle">
                              {r.status ? (
                                <span className="rounded-full bg-surface-2 px-2 py-0.5 ring-1 ring-subtle">
                                  {r.status}
                                </span>
                              ) : null}

                              {tools.columns.eventGroup ? (
                                <span className="rounded-full bg-surface-2 px-2 py-0.5 ring-1 ring-subtle">
                                  {getGroupKey(r)}
                                </span>
                              ) : null}

                              {tools.columns.scholarship && r.scholarship_amount !== null && r.scholarship_unit ? (
                                <span className="rounded-full bg-surface-2 px-2 py-0.5 ring-1 ring-subtle">
                                  Scholarship: {r.scholarship_amount}
                                  {r.scholarship_unit === "percent" ? "%" : ""}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {/* Manage Athlete Modal */}
      {selectedAthlete ? (
        <ManageAthleteModal
          selectedAthlete={selectedAthlete}
          programId={programId}
          teamId={teamId}
          onClose={() => setSelectedAthlete(null)}
          onUpdated={(updated) => {
            setSelectedAthlete(updated);
            setRoster((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
          }}
        />
      ) : null}
      {/* Quick-add Athlete Modal (recruit pool only) */}
      {quickAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/60"
            onClick={() => setQuickAddOpen(false)}
          />

          <div className="relative mx-4 w-full max-w-2xl rounded-2xl bg-surface-1 p-5 ring-1 ring-subtle shadow-2xl text-[color:var(--text)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold">Quick-add Athlete</h2>
                <p className="mt-1 text-[11px] text-muted">
                  Select from the recruit pool only. Adds to the active season roster.
                </p>
              </div>

              <button
                type="button"
                className="rounded-lg border border-subtle bg-surface-2 px-3 py-1.5 text-[11px] font-semibold hover:bg-surface-1"
                onClick={() => setQuickAddOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <input
                value={recruitSearch}
                onChange={(e) => setRecruitSearch(e.target.value)}
                placeholder="Search recruits…"
                className="w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-[12px] placeholder:text-subtle focus:outline-none focus:ring-2 focus-ring"
              />

              <button
                type="button"
                className="inline-flex items-center justify-center rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-[11px] font-semibold hover:bg-surface-1"
                onClick={loadRecruitPool}
              >
                Refresh
              </button>
            </div>

            {recruitLoading ? (
              <p className="mt-4 text-[12px] text-muted">Loading recruit pool…</p>
            ) : recruitError ? (
              <p className="mt-4 text-[12px] text-red-400">{recruitError}</p>
            ) : recruits.length === 0 ? (
              <p className="mt-4 text-[12px] text-muted">No recruits found.</p>
            ) : (
              <QuickAddRecruitList
                recruits={recruits}
                search={recruitSearch}
                collapsed={recruitCollapsed}
                setCollapsed={(updater) =>
                  setRecruitCollapsed((prev) => {
                    const next =
                      typeof updater === "function"
                        ? (updater as any)(prev)
                        : updater;
                    try {
                      sessionStorage.setItem(
                        `${storageKeyBase}:quickAdd:collapsed`,
                        JSON.stringify(next)
                      );
                    } catch {
                      // ignore
                    }
                    return next;
                  })
                }
                onAdd={handleQuickAdd}
                addingAthleteId={addingAthleteId}
                existingAthleteIds={new Set(roster.map((r) => r.athlete_id))}
              />
            )}

          </div>
        </div>
      )}
    </div>
  );
}

export function ManageAthleteModal({
  selectedAthlete,
  programId,
  teamId,
  onClose,
  onUpdated,
}: {
  selectedAthlete: ActiveRosterApiRow;
  programId: string;
  teamId: string;
  onClose: () => void;
  onUpdated?: (updated: ActiveRosterApiRow) => void;
}) {
  type AdminDraft = {
    status: string | null;
    event_group: string | null;
    scholarship_amount: number | null;
    scholarship_unit: string | null;
    scholarship_notes: string | null;
    notes: string | null;
  };

  const getGroupKey = (row: ActiveRosterApiRow) =>
    row.roster_event_group ??
    row.athlete_default_event_group ??
    row.athlete_event_group ??
    "Unassigned";

  const [isEditingAdmin, setIsEditingAdmin] = useState(false);
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminDraft, setAdminDraft] = useState<AdminDraft>({
    status: null,
    event_group: null,
    scholarship_amount: null,
    scholarship_unit: "percent",
    scholarship_notes: null,
    notes: null,
  });

  useEffect(() => {
    setIsEditingAdmin(false);
    setAdminSaving(false);
    setAdminError(null);

    setAdminDraft({
      status: selectedAthlete.status ?? null,
      event_group:
        selectedAthlete.roster_event_group ??
        selectedAthlete.athlete_default_event_group ??
        selectedAthlete.athlete_event_group ??
        null,
      scholarship_amount:
        typeof selectedAthlete.scholarship_amount === "number"
          ? selectedAthlete.scholarship_amount
          : null,
      scholarship_unit: selectedAthlete.scholarship_unit ?? "percent",
      scholarship_notes: null,
      notes: null,
    });
  }, [selectedAthlete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      <div className="relative mx-4 flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-surface-2 ring-1 ring-subtle shadow-2xl text-[color:var(--text)]">
        {/* Zone 1: Identity Header (fixed) */}
        <div className="flex items-start justify-between gap-4 border-b border-subtle bg-surface-1 px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="h-12 w-10 overflow-hidden rounded-lg bg-surface-2 ring-1 ring-subtle">
              {selectedAthlete.athlete_avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedAthlete.athlete_avatar_url}
                  alt={`${selectedAthlete.athlete_first_name} ${selectedAthlete.athlete_last_name}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-subtle">
                  —
                </div>
              )}
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold">
                {selectedAthlete.athlete_first_name} {selectedAthlete.athlete_last_name}
              </h2>

              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                <span className="rounded-full bg-surface-1 px-2.5 py-1 ring-1 ring-subtle">
                  Grad:{" "}
                  <span className="font-semibold text-[color:var(--text)]">
                    {selectedAthlete.athlete_grad_year ?? "—"}
                  </span>
                </span>
                <span className="rounded-full bg-surface-1 px-2.5 py-1 ring-1 ring-subtle">
                  Group:{" "}
                  <span className="font-semibold text-[color:var(--text)]">
                    {getGroupKey(selectedAthlete)}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="shrink-0 rounded-lg border border-subtle bg-surface-2 px-3 py-1.5 text-[11px] font-semibold hover:bg-surface-1"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {/* Zone 2: Profile (scrollable, read-only) */}
        <div className="flex-1 overflow-y-auto bg-surface-2 px-5 py-4">
          <div className="space-y-3">
            <section className="rounded-xl bg-surface-1 p-4 ring-1 ring-subtle">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Overview
                </h3>
                <span className="text-[10px] text-subtle">Read-only</span>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                    Name
                  </p>
                  <p className="mt-1 text-[12px] font-semibold">
                    {selectedAthlete.athlete_first_name} {selectedAthlete.athlete_last_name}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                    Grad Year
                  </p>
                  <p className="mt-1 text-[12px] font-semibold">
                    {selectedAthlete.athlete_grad_year ?? "—"}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                    Event Group
                  </p>
                  <p className="mt-1 text-[12px] font-semibold">
                    {getGroupKey(selectedAthlete)}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                    Scholarship
                  </p>
                  <p className="mt-1 text-[12px] font-semibold">
                    {selectedAthlete.scholarship_amount !== null && selectedAthlete.scholarship_unit
                      ? `${selectedAthlete.scholarship_amount}${selectedAthlete.scholarship_unit === "percent" ? "%" : ""}`
                      : "—"}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-xl bg-surface-1 p-4 ring-1 ring-subtle">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Performance Snapshot
              </h3>
              <p className="mt-2 text-[12px] text-muted">
                This section will surface PRs and recent results from the athlete performance history.
              </p>
              <div className="mt-3 rounded-lg bg-surface-2 p-3 ring-1 ring-subtle">
                <p className="text-[11px] text-subtle">Not yet connected.</p>
              </div>
            </section>

            <section className="rounded-xl bg-surface-1 p-4 ring-1 ring-subtle">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Notes
              </h3>
              <p className="mt-2 text-[12px] text-muted">
                Athlete profile notes will live here (read-only in this modal).
              </p>
              <div className="mt-3 rounded-lg bg-surface-2 p-3 ring-1 ring-subtle">
                <p className="text-[11px] text-subtle">Not yet connected.</p>
              </div>
            </section>
          </div>
        </div>

        {/* Zone 3: Roster Administration (fixed) */}
        <div className="border-t border-subtle bg-surface-1 px-5 py-4 shadow-[0_-10px_30px_-20px_rgba(0,0,0,0.65)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-[12px] font-semibold">Roster Administration</h3>
              <p className="mt-1 text-[11px] text-muted">Current-season administrative truth.</p>
            </div>

            {!isEditingAdmin ? (
              <button
                type="button"
                className="shrink-0 rounded-lg border border-subtle bg-surface-2 px-3 py-1.5 text-[11px] font-semibold hover:bg-surface-1"
                onClick={() => {
                  setAdminError(null);
                  setIsEditingAdmin(true);
                }}
              >
                Edit
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-subtle bg-surface-2 px-3 py-1.5 text-[11px] font-semibold hover:bg-surface-1"
                  disabled={adminSaving}
                  onClick={() => {
                    setAdminError(null);
                    setIsEditingAdmin(false);

                    setAdminDraft({
                      status: selectedAthlete.status ?? null,
                      event_group:
                        selectedAthlete.roster_event_group ??
                        selectedAthlete.athlete_default_event_group ??
                        selectedAthlete.athlete_event_group ??
                        null,
                      scholarship_amount:
                        typeof selectedAthlete.scholarship_amount === "number"
                          ? selectedAthlete.scholarship_amount
                          : null,
                      scholarship_unit: selectedAthlete.scholarship_unit ?? "percent",
                      scholarship_notes: null,
                      notes: null,
                    });
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="rounded-lg bg-sky-500 px-3 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-60"
                  disabled={adminSaving}
                  onClick={async () => {
                    setAdminSaving(true);
                    setAdminError(null);

                    try {
                      const res = await fetch(`/api/programs/${programId}/teams/${teamId}/active-roster`, {
                        method: "PATCH",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          roster_entry_id: selectedAthlete.id,
                          status: adminDraft.status,
                          event_group: adminDraft.event_group,
                          scholarship_amount: adminDraft.scholarship_amount,
                          scholarship_unit: adminDraft.scholarship_unit,
                          scholarship_notes: adminDraft.scholarship_notes,
                          notes: adminDraft.notes,
                        }),
                      });

                      const body = await res.json().catch(() => ({}));

                      if (!res.ok) {
                        console.error("[active-roster/page] admin save failed", body);
                        setAdminError(body.error || "Failed to save roster administration");
                        return;
                      }

                      const updated = (body.roster_entry ?? body.rosterEntry ?? null) as ActiveRosterApiRow | null;

                      if (updated) {
                        onUpdated?.(updated);
                      }

                      setIsEditingAdmin(false);
                    } catch (e) {
                      console.error("[active-roster/page] admin save error", e);
                      setAdminError("Failed to save roster administration");
                    } finally {
                      setAdminSaving(false);
                    }
                  }}
                >
                  {adminSaving ? "Saving…" : "Save"}
                </button>
              </div>
            )}
          </div>

          {adminError ? <p className="mt-3 text-[12px] text-red-400">{adminError}</p> : null}

          {!isEditingAdmin ? (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-surface-2 p-3 ring-1 ring-subtle">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Status</p>
                <p className="mt-1 text-[12px] font-semibold">{selectedAthlete.status ?? "—"}</p>
              </div>

              <div className="rounded-xl bg-surface-2 p-3 ring-1 ring-subtle">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Event Group</p>
                <p className="mt-1 text-[12px] font-semibold">{getGroupKey(selectedAthlete)}</p>
              </div>

              <div className="rounded-xl bg-surface-2 p-3 ring-1 ring-subtle">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Scholarship</p>
                <p className="mt-1 text-[12px] font-semibold">
                  {selectedAthlete.scholarship_amount !== null && selectedAthlete.scholarship_unit
                    ? `${selectedAthlete.scholarship_amount}${selectedAthlete.scholarship_unit === "percent" ? "%" : ""}`
                    : "—"}
                </p>
                <p className="mt-1 text-[10px] text-subtle">Notes: —</p>
              </div>

              <div className="rounded-xl bg-surface-2 p-3 ring-1 ring-subtle">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Roster Notes</p>
                <p className="mt-1 text-[12px] font-semibold">—</p>
              </div>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-surface-2 p-3 ring-1 ring-subtle">
                <label className="text-[10px] font-semibold uppercase tracking-wide text-muted">Status</label>
                <select
                  className="mt-2 w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-[12px] focus:outline-none focus:ring-2 focus-ring"
                  value={adminDraft.status ?? ""}
                  onChange={(e) => setAdminDraft((d) => ({ ...d, status: e.target.value ? e.target.value : null }))}
                >
                  <option value="">—</option>
                  <option value="active">Active</option>
                  <option value="redshirt">Redshirt</option>
                  <option value="injured">Injured</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="rounded-xl bg-surface-2 p-3 ring-1 ring-subtle">
                <label className="text-[10px] font-semibold uppercase tracking-wide text-muted">Event Group</label>
                <input
                  className="mt-2 w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-[12px] placeholder:text-subtle focus:outline-none focus:ring-2 focus-ring"
                  value={adminDraft.event_group ?? ""}
                  placeholder="e.g. Distance"
                  onChange={(e) => setAdminDraft((d) => ({ ...d, event_group: e.target.value ? e.target.value : null }))}
                />
                <p className="mt-1 text-[10px] text-subtle">This updates the roster event group (used for grouping on the roster).</p>
              </div>

              <div className="rounded-xl bg-surface-2 p-3 ring-1 ring-subtle">
                <label className="text-[10px] font-semibold uppercase tracking-wide text-muted">Scholarship</label>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <input
                    inputMode="decimal"
                    className="w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-[12px] placeholder:text-subtle focus:outline-none focus:ring-2 focus-ring"
                    value={adminDraft.scholarship_amount ?? ""}
                    placeholder="Amount"
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "") {
                        setAdminDraft((d) => ({ ...d, scholarship_amount: null }));
                        return;
                      }
                      const n = Number(raw);
                      setAdminDraft((d) => ({
                        ...d,
                        scholarship_amount: Number.isFinite(n) ? n : d.scholarship_amount,
                      }));
                    }}
                  />

                  <select
                    className="w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-[12px] focus:outline-none focus:ring-2 focus-ring"
                    value={adminDraft.scholarship_unit ?? "percent"}
                    onChange={(e) => setAdminDraft((d) => ({ ...d, scholarship_unit: e.target.value }))}
                  >
                    <option value="percent">Percent</option>
                    <option value="equivalency">Equivalency</option>
                    <option value="amount">Amount</option>
                  </select>
                </div>

                <textarea
                  className="mt-2 w-full resize-none rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-[12px] placeholder:text-subtle focus:outline-none focus:ring-2 focus-ring"
                  rows={2}
                  placeholder="Scholarship notes (optional)"
                  value={adminDraft.scholarship_notes ?? ""}
                  onChange={(e) => setAdminDraft((d) => ({ ...d, scholarship_notes: e.target.value ? e.target.value : null }))}
                />
              </div>

              <div className="rounded-xl bg-surface-2 p-3 ring-1 ring-subtle">
                <label className="text-[10px] font-semibold uppercase tracking-wide text-muted">Roster Notes</label>
                <textarea
                  className="mt-2 w-full resize-none rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-[12px] placeholder:text-subtle focus:outline-none focus:ring-2 focus-ring"
                  rows={5}
                  placeholder="Administrative notes for the current season"
                  value={adminDraft.notes ?? ""}
                  onChange={(e) => setAdminDraft((d) => ({ ...d, notes: e.target.value ? e.target.value : null }))}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function cryptoRandomKey() {
  // simple client-safe key; avoids importing crypto in the client bundle
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

type QuickAddRecruitListProps = {
  recruits: RecruitPoolRow[];
  search: string;
  collapsed: Record<string, boolean>;
  setCollapsed: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  onAdd: (athleteId: string) => void | Promise<void>;
  addingAthleteId: string | null;
  existingAthleteIds: Set<string>;
};

function QuickAddRecruitList({
  recruits,
  search,
  collapsed,
  setCollapsed,
  onAdd,
  addingAthleteId,
  existingAthleteIds,
}: QuickAddRecruitListProps) {
  const term = search.trim().toLowerCase();

  const filtered = term
    ? recruits.filter((r) => {
        const full = `${r.first_name} ${r.last_name}`.toLowerCase();
        const gy = r.grad_year ? `${r.grad_year}` : "";
        return (
          full.includes(term) ||
          r.last_name.toLowerCase().includes(term) ||
          r.first_name.toLowerCase().includes(term) ||
          gy.includes(term)
        );
      })
    : recruits;

  const groupKey = (r: RecruitPoolRow) => r.event_group ?? "Unassigned";

  const grouped = filtered.reduce<Record<string, RecruitPoolRow[]>>((acc, r) => {
    const k = groupKey(r);
    if (!acc[k]) acc[k] = [];
    acc[k].push(r);
    return acc;
  }, {});

  const groupOrder = Object.keys(grouped).sort((a, b) => {
    if (a === "Unassigned") return 1;
    if (b === "Unassigned") return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="mt-4 max-h-[55vh] overflow-y-auto pr-1">
      <div className="space-y-2">
        {groupOrder.map((g) => {
          const rows = grouped[g] ?? [];
          const isCollapsed = collapsed[g] ?? false;

          return (
            <div key={g} className="rounded-xl bg-surface-1 ring-1 ring-subtle">
              <button
                type="button"
                onClick={() =>
                  setCollapsed((prev) => ({ ...prev, [g]: !(prev[g] ?? false) }))
                }
                className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                    {g}
                  </span>
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-muted ring-1 ring-subtle">
                    {rows.length}
                  </span>
                </div>
                <span className="text-[10px] text-subtle">
                  {isCollapsed ? "Show" : "Hide"}
                </span>
              </button>

              {!isCollapsed && (
                <div className="divide-y divide-[color:var(--border)]">
                  {rows.map((r) => {
                    const athleteId = r.athlete_id;
                    const isBusy = addingAthleteId === athleteId;
                    const onRoster = athleteId ? existingAthleteIds.has(athleteId) : false;

                    return (
                      <div key={r.id} className="flex items-center justify-between gap-3 px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-[12px] font-semibold">
                            {r.first_name} {r.last_name}
                          </p>
                          <p className="mt-0.5 text-[10px] text-subtle">
                            {r.grad_year ? `Grad ${r.grad_year}` : ""}
                          </p>
                        </div>

                        <button
                          type="button"
                          disabled={!athleteId || isBusy || onRoster}
                          onClick={() => athleteId && onAdd(athleteId)}
                          className={
                            "shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition " +
                            (isBusy || onRoster
                              ? "bg-surface-2 text-muted ring-1 ring-subtle"
                              : "bg-sky-500 text-slate-950 hover:bg-sky-400")
                          }
                        >
                          {isBusy ? "Adding…" : onRoster ? "On roster" : "Add"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}