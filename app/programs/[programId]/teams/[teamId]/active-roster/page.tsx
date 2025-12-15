// app/programs/[programId]/teams/[teamId]/active-roster/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [season, setSeason] = useState<ActiveRosterApiResponse["season"]>(null);
  const [roster, setRoster] = useState<ActiveRosterApiRow[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const [selectedAthlete, setSelectedAthlete] = useState<ActiveRosterApiRow | null>(null);

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

  const grouped = useMemo(() => {
    const acc: Record<string, ActiveRosterApiRow[]> = {};
    for (const r of roster) {
      const k = getGroupKey(r);
      if (!acc[k]) acc[k] = [];
      acc[k].push(r);
    }
    return acc;
  }, [roster]);

  const groupOrder = useMemo(() => {
    return Object.keys(grouped).sort((a, b) => {
      if (a === "Unassigned") return 1;
      if (b === "Unassigned") return -1;
      return a.localeCompare(b);
    });
  }, [grouped]);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="rounded-2xl bg-slate-900/70 p-5 ring-1 ring-slate-800 backdrop-blur-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-100">Active Roster</h1>
            <p className="mt-1 text-[12px] text-slate-500">
              Work surface for the current team season roster.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
              {season ? (
                <span className="rounded-full bg-slate-950/40 px-3 py-1 ring-1 ring-slate-800">
                  Season:{" "}
                  <span className="font-semibold text-slate-200">
                    {season.season_label ?? "Season"}
                    {season.season_year ? ` ${season.season_year}` : ""}
                  </span>
                </span>
              ) : (
                <span className="rounded-full bg-slate-950/40 px-3 py-1 ring-1 ring-slate-800">
                  No season detected yet
                </span>
              )}
              <span className="rounded-full bg-slate-950/40 px-3 py-1 ring-1 ring-slate-800">
                Athletes:{" "}
                <span className="font-semibold text-slate-200">{roster.length}</span>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-slate-900"
              onClick={handleOpenQuickAdd}
            >
              Quick-add Athlete
            </button>
          </div>
        </div>

        <div className="mt-5">
          {loading ? (
            <p className="text-[12px] text-slate-400">Loading…</p>
          ) : error ? (
            <p className="text-[12px] text-red-400">{error}</p>
          ) : roster.length === 0 ? (
            <div className="rounded-xl bg-slate-950/30 p-4 ring-1 ring-slate-800">
              <p className="text-[12px] text-slate-500">
                No athletes on the active roster yet.
              </p>
              <p className="mt-2 text-[11px] text-slate-600">
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
                    className="rounded-xl bg-slate-950/20 ring-1 ring-slate-800"
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
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-200">
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
                      <div className="divide-y divide-slate-800/60">
                        {rows.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => setSelectedAthlete(r)}
                            className="flex w-full flex-col gap-1 px-4 py-3 text-left hover:bg-slate-900/30"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-[12px] font-semibold text-slate-100">
                                {r.athlete_first_name} {r.athlete_last_name}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                {r.athlete_grad_year ? `Grad ${r.athlete_grad_year}` : ""}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                              {r.status ? (
                                <span className="rounded-full bg-slate-900 px-2 py-0.5 ring-1 ring-slate-800">
                                  {r.status}
                                </span>
                              ) : null}

                              {r.scholarship_amount !== null && r.scholarship_unit ? (
                                <span className="rounded-full bg-slate-900 px-2 py-0.5 ring-1 ring-slate-800">
                                  Scholarship: {r.scholarship_amount}
                                  {r.scholarship_unit === "percent" ? "%" : ""}
                                </span>
                              ) : null}
                            </div>
                          </button>
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
      {selectedAthlete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/60"
            onClick={() => setSelectedAthlete(null)}
          />

          <div className="relative mx-4 flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-slate-950 ring-1 ring-slate-800 shadow-2xl">
            {/* Zone 1: Identity Header (fixed) */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-800/80 bg-slate-950 px-5 py-4">
              <div className="flex min-w-0 items-start gap-3">
                <div className="h-12 w-10 overflow-hidden rounded-lg bg-slate-900 ring-1 ring-slate-800">
                  {selectedAthlete.athlete_avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedAthlete.athlete_avatar_url}
                      alt={`${selectedAthlete.athlete_first_name} ${selectedAthlete.athlete_last_name}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-slate-500">
                      —
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold text-slate-100">
                    {selectedAthlete.athlete_first_name} {selectedAthlete.athlete_last_name}
                  </h2>

                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                    <span className="rounded-full bg-slate-950/40 px-2.5 py-1 ring-1 ring-slate-800">
                      Grad: <span className="font-semibold text-slate-200">{selectedAthlete.athlete_grad_year ?? "—"}</span>
                    </span>
                    <span className="rounded-full bg-slate-950/40 px-2.5 py-1 ring-1 ring-slate-800">
                      Group: <span className="font-semibold text-slate-200">{getGroupKey(selectedAthlete)}</span>
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="shrink-0 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-slate-800"
                onClick={() => setSelectedAthlete(null)}
              >
                Close
              </button>
            </div>

            {/* Zone 2: Profile (scrollable, read-only) */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="space-y-3">
                <section className="rounded-xl bg-slate-900/20 p-4 ring-1 ring-slate-800">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">
                      Overview
                    </h3>
                    <span className="text-[10px] text-slate-600">Read-only</span>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Name</p>
                      <p className="mt-1 text-[12px] font-semibold text-slate-100">
                        {selectedAthlete.athlete_first_name} {selectedAthlete.athlete_last_name}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Grad Year</p>
                      <p className="mt-1 text-[12px] font-semibold text-slate-100">{selectedAthlete.athlete_grad_year ?? "—"}</p>
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Event Group</p>
                      <p className="mt-1 text-[12px] font-semibold text-slate-100">{getGroupKey(selectedAthlete)}</p>
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Scholarship</p>
                      <p className="mt-1 text-[12px] font-semibold text-slate-100">
                        {selectedAthlete.scholarship_amount !== null && selectedAthlete.scholarship_unit
                          ? `${selectedAthlete.scholarship_amount}${selectedAthlete.scholarship_unit === "percent" ? "%" : ""}`
                          : "—"}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-xl bg-slate-900/20 p-4 ring-1 ring-slate-800">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">
                    Performance Snapshot
                  </h3>
                  <p className="mt-2 text-[12px] text-slate-500">
                    This section will surface PRs and recent results from the athlete performance history.
                  </p>
                  <div className="mt-3 rounded-lg bg-slate-950/30 p-3 ring-1 ring-slate-800">
                    <p className="text-[11px] text-slate-600">Not yet connected.</p>
                  </div>
                </section>

                <section className="rounded-xl bg-slate-900/20 p-4 ring-1 ring-slate-800">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">
                    Notes
                  </h3>
                  <p className="mt-2 text-[12px] text-slate-500">
                    Athlete profile notes will live here (read-only in this modal).
                  </p>
                  <div className="mt-3 rounded-lg bg-slate-950/30 p-3 ring-1 ring-slate-800">
                    <p className="text-[11px] text-slate-600">Not yet connected.</p>
                  </div>
                </section>
              </div>
            </div>

            {/* Zone 3: Roster Administration (fixed, read-only) */}
            <div className="border-t border-slate-800/80 bg-slate-950 px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-[12px] font-semibold text-slate-100">Roster Administration</h3>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Current-season administrative truth (read-only until edited).
                  </p>
                </div>

                <button
                  type="button"
                  className="shrink-0 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-slate-800"
                  onClick={() => {
                    // Step 1 will enable true edit mode; keeping button now to anchor UX.
                    // Intentionally no-op until PATCH contract is in place.
                  }}
                >
                  Edit
                </button>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-900/25 p-3 ring-1 ring-slate-800">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Status</p>
                  <p className="mt-1 text-[12px] font-semibold text-slate-100">{selectedAthlete.status ?? "—"}</p>
                </div>

                <div className="rounded-xl bg-slate-900/25 p-3 ring-1 ring-slate-800">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Event Group</p>
                  <p className="mt-1 text-[12px] font-semibold text-slate-100">{getGroupKey(selectedAthlete)}</p>
                </div>

                <div className="rounded-xl bg-slate-900/25 p-3 ring-1 ring-slate-800">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Scholarship</p>
                  <p className="mt-1 text-[12px] font-semibold text-slate-100">
                    {selectedAthlete.scholarship_amount !== null && selectedAthlete.scholarship_unit
                      ? `${selectedAthlete.scholarship_amount}${selectedAthlete.scholarship_unit === "percent" ? "%" : ""}`
                      : "—"}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-600">Notes: —</p>
                </div>

                <div className="rounded-xl bg-slate-900/25 p-3 ring-1 ring-slate-800">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Roster Notes</p>
                  <p className="mt-1 text-[12px] font-semibold text-slate-100">—</p>
                </div>
              </div>

              <p className="mt-3 text-[10px] text-slate-600">
                Next: enable inline edit mode here for Status, Event Group, Scholarship (amount/unit/notes), and Roster Notes.
              </p>
            </div>
          </div>
        </div>
      )}
      {/* Quick-add Athlete Modal (recruit pool only) */}
      {quickAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/60"
            onClick={() => setQuickAddOpen(false)}
          />

          <div className="relative mx-4 w-full max-w-2xl rounded-2xl bg-slate-950 p-5 ring-1 ring-slate-800 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-100">Quick-add Athlete</h2>
                <p className="mt-1 text-[11px] text-slate-500">
                  Select from the recruit pool only. Adds to the active season roster.
                </p>
              </div>

              <button
                type="button"
                className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-slate-800"
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
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-[12px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              />

              <button
                type="button"
                className="inline-flex items-center justify-center rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-[11px] font-semibold text-slate-200 hover:bg-slate-800"
                onClick={loadRecruitPool}
              >
                Refresh
              </button>
            </div>

            {recruitLoading ? (
              <p className="mt-4 text-[12px] text-slate-400">Loading recruit pool…</p>
            ) : recruitError ? (
              <p className="mt-4 text-[12px] text-red-400">{recruitError}</p>
            ) : recruits.length === 0 ? (
              <p className="mt-4 text-[12px] text-slate-500">No recruits found.</p>
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

            <p className="mt-4 text-[10px] text-slate-600">
              Tip: Switch team modes using the tabs above (outside this work surface).
            </p>
          </div>
        </div>
      )}
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
            <div key={g} className="rounded-xl bg-slate-950/30 ring-1 ring-slate-800">
              <button
                type="button"
                onClick={() =>
                  setCollapsed((prev) => ({ ...prev, [g]: !(prev[g] ?? false) }))
                }
                className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-300">
                    {g}
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
                <div className="divide-y divide-slate-800/60">
                  {rows.map((r) => {
                    const athleteId = r.athlete_id;
                    const isBusy = addingAthleteId === athleteId;
                    const onRoster = athleteId ? existingAthleteIds.has(athleteId) : false;

                    return (
                      <div key={r.id} className="flex items-center justify-between gap-3 px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-[12px] font-semibold text-slate-100">
                            {r.first_name} {r.last_name}
                          </p>
                          <p className="mt-0.5 text-[10px] text-slate-500">
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
                              ? "bg-slate-800 text-slate-300"
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