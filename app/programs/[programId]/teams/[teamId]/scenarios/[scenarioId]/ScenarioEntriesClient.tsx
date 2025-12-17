"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ManageAthleteModal } from "../../active-roster/page";

type RecruitRow = {
  // normalized id we use in UI + actions (must be stable)
  id: string;
  // raw fields we might get back from the API
  program_recruit_id?: string;
  first_name: string;
  last_name: string;
  grad_year?: number | null;
  event_group?: string | null;
  pipeline_stage?: string | null;
};

type ReturningAthleteRow = {
  athlete_id: string;
  first_name: string;
  last_name: string;
  grad_year?: number | null;
  event_group?: string | null;
};

type Props = {
  programId: string;
  teamId: string;
  scenarioId: string;
  isManager: boolean;
};

export default function ScenarioEntriesClient({
  programId,
  teamId,
  scenarioId,
  isManager,
}: Props) {
  const router = useRouter();
  const removedIdsRef = useRef<Set<string>>(new Set());

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recruits, setRecruits] = useState<RecruitRow[]>([]);
  const [query, setQuery] = useState("");

  // Returning athletes modal state
  const [returningOpen, setReturningOpen] = useState(false);
  const [returningLoading, setReturningLoading] = useState(false);
  const [returningError, setReturningError] = useState<string | null>(null);
  const [returningAll, setReturningAll] = useState<ReturningAthleteRow[]>([]);
  const [returningRemovedIds, setReturningRemovedIds] = useState<Set<string>>(
    new Set()
  );
  const [returningSaving, setReturningSaving] = useState(false);

  // Housekeeping modal (optional follow-up after removing returning athletes)
  const [housekeepingOpen, setHousekeepingOpen] = useState(false);
  // Which removed athletes should be persisted as program-level non-returners
  const [housekeepingNonReturningIds, setHousekeepingNonReturningIds] = useState<Set<string>>(
    new Set()
  );
  const [housekeepingSaving, setHousekeepingSaving] = useState(false);
  const [housekeepingError, setHousekeepingError] = useState<string | null>(null);
  async function persistProgramNonReturners(athleteIds: string[]) {
    if (!isManager) return;
    if (athleteIds.length === 0) return;

    setHousekeepingSaving(true);
    setHousekeepingError(null);

    try {
      await Promise.all(
        athleteIds.map(async (athleteId) => {
          const res = await fetch(
            `/api/programs/${programId}/teams/${teamId}/roster-scenarios/${scenarioId}/returning-candidates`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                athlete_id: athleteId,
                is_returning: false,
              }),
            }
          );

          if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new Error(
              `Failed to mark non-returning (${res.status})${text ? `: ${text}` : ""}`
            );
          }
        })
      );

      // Force next open to re-fetch with the new exclusions
      setReturningAll([]);
      setReturningRemovedIds(new Set());
      removedIdsRef.current = new Set();

      router.refresh();
      setHousekeepingOpen(false);
    } catch (e: any) {
      setHousekeepingError(e?.message ?? "Failed to save housekeeping");
    } finally {
      setHousekeepingSaving(false);
    }
  }

  const [manageAthleteOpen, setManageAthleteOpen] = useState(false);
  const [manageAthleteRow, setManageAthleteRow] = useState<any | null>(null);
  const [manageAthleteUnavailableOpen, setManageAthleteUnavailableOpen] = useState(false);
  const [manageAthleteUnavailableMsg, setManageAthleteUnavailableMsg] = useState<string>(
    "This athlete isn’t on the Active Roster yet, so the Active Roster admin modal can’t open."
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/programs/${programId}/recruits`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error(`Failed to load recruits (${res.status})`);

        const json = await res.json();
        const rawRows: any[] = Array.isArray(json?.recruits)
          ? json.recruits
          : Array.isArray(json)
          ? json
          : [];

        const normalized: RecruitRow[] = rawRows
          .map((r) => {
            const stableId = r?.program_recruit_id ?? r?.id;
            if (!stableId) return null;
            return {
              id: String(stableId),
              program_recruit_id: r?.program_recruit_id
                ? String(r.program_recruit_id)
                : undefined,
              first_name: String(r?.first_name ?? ""),
              last_name: String(r?.last_name ?? ""),
              grad_year: r?.grad_year ?? null,
              event_group: r?.event_group ?? null,
              pipeline_stage: r?.pipeline_stage ?? null,
            };
          })
          .filter(Boolean) as RecruitRow[];

        const pruned = normalized.filter((r) => !removedIdsRef.current.has(r.id));
        if (!cancelled) setRecruits(pruned);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load recruits");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [programId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return recruits;
    return recruits.filter((r) => {
      const name = `${r.first_name ?? ""} ${r.last_name ?? ""}`.toLowerCase();
      const eg = (r.event_group ?? "").toLowerCase();
      const gy = r.grad_year ? String(r.grad_year) : "";
      return name.includes(q) || eg.includes(q) || gy.includes(q);
    });
  }, [recruits, query]);

  async function handleAdd(recruitId: string) {
    if (!isManager) return;
    setSavingId(recruitId);
    setError(null);

    try {
      const res = await fetch(
        `/api/programs/${programId}/teams/${teamId}/roster-scenarios/${scenarioId}/entries/add-from-recruit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            program_recruit_id: recruitId,
            programRecruitId: recruitId,
          }),
        }
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Failed to add (${res.status})${text ? `: ${text}` : ""}`);
      }

      removedIdsRef.current.add(recruitId);
      setRecruits((prev) => prev.filter((r) => r.id !== recruitId));
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "Failed to add recruit");
    } finally {
      setSavingId(null);
    }
  }

  const returningSelected = useMemo(() => {
    return returningAll.filter((a) => !returningRemovedIds.has(a.athlete_id));
  }, [returningAll, returningRemovedIds]);

  const returningRemoved = useMemo(() => {
    return returningAll.filter((a) => returningRemovedIds.has(a.athlete_id));
  }, [returningAll, returningRemovedIds]);

  async function openReturningModal() {
    if (!isManager) return;
    setReturningOpen(true);
    setReturningError(null);

    // Only load once per session
    if (returningAll.length > 0) return;

    setReturningLoading(true);
    try {
      const res = await fetch(
        `/api/programs/${programId}/teams/${teamId}/roster-scenarios/${scenarioId}/returning-candidates`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          `Failed to load returning athletes (${res.status})${text ? `: ${text}` : ""}`
        );
      }

      const json = await res.json();
      const rows: any[] = Array.isArray(json?.athletes)
        ? json.athletes
        : Array.isArray(json)
        ? json
        : [];

      const normalized: ReturningAthleteRow[] = rows
        .map((r) => {
          const id = r?.athlete_id ?? r?.id;
          if (!id) return null;
          return {
            athlete_id: String(id),
            first_name: String(r?.first_name ?? ""),
            last_name: String(r?.last_name ?? ""),
            grad_year: r?.grad_year ?? null,
            event_group: r?.event_group ?? null,
          };
        })
        .filter(Boolean) as ReturningAthleteRow[];

      setReturningAll(normalized);
    } catch (e: any) {
      setReturningError(e?.message ?? "Failed to load returning athletes");
    } finally {
      setReturningLoading(false);
    }
  }

  function removeFromReturningImport(athleteId: string) {
    setReturningRemovedIds((prev) => {
      const next = new Set(prev);
      next.add(athleteId);
      return next;
    });
  }

  async function openManageAthleteFromHousekeeping(athleteId: string) {
    try {
      const res = await fetch(`/api/programs/${programId}/teams/${teamId}/active-roster`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        setManageAthleteUnavailableMsg(
          "Couldn’t load the Active Roster right now. Try again in a moment."
        );
        setManageAthleteUnavailableOpen(true);
        return;
      }

      const body = await res.json().catch(() => ({}));
      const rows: any[] = Array.isArray(body?.roster)
        ? body.roster
        : Array.isArray(body?.rows)
        ? body.rows
        : Array.isArray(body)
        ? body
        : [];

      const found = rows.find(
        (r) => String(r?.athlete_id ?? r?.athleteId ?? "") === String(athleteId)
      );

      if (!found) {
        setManageAthleteUnavailableMsg(
          "This athlete isn’t on the Active Roster yet, so the Active Roster admin modal can’t open here."
        );
        setManageAthleteUnavailableOpen(true);
        return;
      }

      setManageAthleteRow(found);
      setManageAthleteOpen(true);
    } catch {
      setManageAthleteUnavailableMsg(
        "Couldn’t open the athlete modal due to a network error. Try again."
      );
      setManageAthleteUnavailableOpen(true);
    }
  }

  async function addReturningAthletes() {
    if (!isManager) return;

    if (returningSelected.length === 0) {
      setReturningOpen(false);
      if (returningRemovedIds.size > 0) {
        setTimeout(() => {
          setHousekeepingNonReturningIds(new Set(Array.from(returningRemovedIds)));
          setHousekeepingError(null);
          setHousekeepingOpen(true);
        }, 0);
      }
      return;
    }

    setReturningSaving(true);
    setReturningError(null);

    try {
      // Use existing single-entry endpoint (athlete_id support) to avoid new bulk API for now.
      await Promise.all(
        returningSelected.map(async (a) => {
          const res = await fetch(
            `/api/programs/${programId}/teams/${teamId}/roster-scenarios/${scenarioId}/entries`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                athlete_id: a.athlete_id,
                athleteId: a.athlete_id,
              }),
            }
          );

          // 409 (already exists) is safe to ignore
          if (!res.ok && res.status !== 409) {
            const text = await res.text().catch(() => "");
            throw new Error(
              `Failed adding ${a.first_name} ${a.last_name} (${res.status})${
                text ? `: ${text}` : ""
              }`
            );
          }
        })
      );

      setReturningOpen(false);
      router.refresh();

      if (returningRemovedIds.size > 0) {
        setTimeout(() => {
          setHousekeepingNonReturningIds(new Set(Array.from(returningRemovedIds)));
          setHousekeepingError(null);
          setHousekeepingOpen(true);
        }, 0);
      }
    } catch (e: any) {
      setReturningError(e?.message ?? "Failed to add returning athletes");
    } finally {
      setReturningSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      {manageAthleteUnavailableOpen ? (
        <div className="fixed inset-0 z-[102] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-xl bg-[var(--surface)] ring-1 ring-[var(--border)]">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                  Not available yet
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
                  {manageAthleteUnavailableMsg}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setManageAthleteUnavailableOpen(false)}
                className="h-8 shrink-0 rounded-md bg-[var(--muted)] px-3 text-[11px] font-semibold text-[var(--foreground)] ring-1 ring-[var(--border)] hover:bg-[var(--muted-hover)]"
              >
                Close
              </button>
            </div>

            <div className="p-4">
              <p className="text-[11px] text-[var(--muted-foreground)]">
                Next: we’ll add a scenario-safe housekeeping modal that can persist “not returning” without requiring Active Roster membership.
              </p>
            </div>
          </div>
        </div>
      ) : null}
      {manageAthleteOpen && manageAthleteRow ? (
        <ManageAthleteModal
          selectedAthlete={manageAthleteRow}
          programId={programId}
          teamId={teamId}
          onClose={() => {
            setManageAthleteOpen(false);
            setManageAthleteRow(null);
          }}
          onUpdated={(updated) => {
            setManageAthleteRow(updated);
            router.refresh();
          }}
        />
      ) : null}
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-[var(--foreground)]">Add to scenario</p>
        <button
          type="button"
          onClick={openReturningModal}
          disabled={!isManager}
          className={
            "h-8 rounded-md px-3 text-[11px] font-semibold ring-1 ring-[var(--border)] " +
            (!isManager
              ? "bg-[var(--surface-subtle)] text-[var(--muted-foreground)] opacity-60"
              : "bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--muted-hover)]")
          }
          title={!isManager ? "Manager permission required" : "Add returning athletes"}
        >
          Add returning athletes
        </button>
      </div>

      {returningOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl overflow-hidden rounded-xl bg-[var(--surface)] ring-1 ring-[var(--border)]">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                  Add returning athletes
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
                  Remove anyone you don’t want to import into this scenario.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setReturningOpen(false);
                    if (returningRemovedIds.size > 0) {
                      setTimeout(() => {
                        setHousekeepingNonReturningIds(new Set(Array.from(returningRemovedIds)));
                        setHousekeepingError(null);
                        setHousekeepingOpen(true);
                      }, 0);
                    }
                  }}
                  className="h-8 rounded-md bg-[var(--surface-subtle)] px-3 text-[11px] font-semibold text-[var(--foreground)] ring-1 ring-[var(--border)] hover:bg-[var(--muted-hover)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={addReturningAthletes}
                  disabled={returningSaving || returningLoading}
                  className={
                    "h-8 rounded-md px-3 text-[11px] font-semibold ring-1 ring-[var(--border)] " +
                    (returningSaving || returningLoading
                      ? "bg-[var(--surface-subtle)] text-[var(--muted-foreground)] opacity-60"
                      : "bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--muted-hover)]")
                  }
                >
                  {returningSaving ? "Adding…" : "Add athletes"}
                </button>
              </div>
            </div>

            {returningError ? (
              <div className="px-4 pt-3 text-[11px] text-[var(--danger)]">{returningError}</div>
            ) : null}

            <div className="max-h-[70vh] overflow-y-auto p-4">
              {returningLoading ? (
                <div className="text-[11px] text-[var(--muted-foreground)]">
                  Loading returning athletes…
                </div>
              ) : returningAll.length === 0 ? (
                <div className="text-[11px] text-[var(--muted-foreground)]">
                  No returning athletes available.
                </div>
              ) : (
                <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-lg ring-1 ring-[var(--border)]">
                  {returningSelected.map((a) => {
                    const label = `${a.first_name} ${a.last_name}`.trim() || "Unnamed athlete";
                    const meta = [
                      a.event_group ? a.event_group : null,
                      a.grad_year ? `’${String(a.grad_year).slice(-2)}` : null,
                    ].filter(Boolean);

                    return (
                      <li
                        key={a.athlete_id}
                        className="flex items-center gap-3 bg-[var(--surface)] px-3 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-semibold text-[var(--foreground)]">
                            {label}
                          </p>
                          {meta.length > 0 ? (
                            <p className="mt-0.5 truncate text-[10px] text-[var(--muted-foreground)]">
                              {meta.join(" • ")}
                            </p>
                          ) : (
                            <p className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">—</p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFromReturningImport(a.athlete_id)}
                          className="h-8 shrink-0 rounded-md bg-[var(--surface-subtle)] px-3 text-[11px] font-semibold text-[var(--foreground)] ring-1 ring-[var(--border)] hover:bg-[var(--muted-hover)]"
                          title="Remove from this import list"
                        >
                          Remove
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {housekeepingOpen ? (
        <div className="fixed inset-0 z-[101] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl overflow-hidden rounded-xl bg-[var(--surface)] ring-1 ring-[var(--border)]">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                  Housekeeping: non-returning athletes
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
                  You removed {returningRemoved.length} athlete
                  {returningRemoved.length === 1 ? "" : "s"} from the returning list. Want
                  to update any of their info now?
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setHousekeepingOpen(false)}
                  className="h-8 rounded-md bg-[var(--surface-subtle)] px-3 text-[11px] font-semibold text-[var(--foreground)] ring-1 ring-[var(--border)] hover:bg-[var(--muted-hover)]"
                >
                  Skip
                </button>
                <button
                  type="button"
                  disabled={housekeepingSaving}
                  onClick={() =>
                    persistProgramNonReturners(Array.from(housekeepingNonReturningIds))
                  }
                  className={
                    "h-8 rounded-md px-3 text-[11px] font-semibold ring-1 ring-[var(--border)] " +
                    (housekeepingSaving
                      ? "bg-[var(--surface-subtle)] text-[var(--muted-foreground)] opacity-60"
                      : "bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--muted-hover)]")
                  }
                >
                  {housekeepingSaving ? "Saving…" : "Done"}
                </button>
              </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-4">
              {housekeepingError ? (
                <div className="mb-3 rounded-md bg-[var(--surface)] p-2 text-[11px] text-[var(--danger)] ring-1 ring-[var(--border)]">
                  {housekeepingError}
                </div>
              ) : null}
              {returningRemoved.length === 0 ? (
                <div className="text-[11px] text-[var(--muted-foreground)]">
                  No athletes were removed.
                </div>
              ) : (
                <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-lg ring-1 ring-[var(--border)]">
                  {returningRemoved.map((a) => {
                    const label = `${a.first_name} ${a.last_name}`.trim() || "Unnamed athlete";
                    const meta = [
                      a.event_group ? a.event_group : null,
                      a.grad_year ? `’${String(a.grad_year).slice(-2)}` : null,
                    ].filter(Boolean);

                    return (
                      <li key={a.athlete_id} className="flex items-center gap-3 bg-[var(--surface)] px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-semibold text-[var(--foreground)]">
                            {label}
                          </p>
                          {meta.length > 0 ? (
                            <p className="mt-0.5 truncate text-[10px] text-[var(--muted-foreground)]">
                              {meta.join(" • ")}
                            </p>
                          ) : (
                            <p className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">—</p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setHousekeepingNonReturningIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(a.athlete_id)) next.delete(a.athlete_id);
                              else next.add(a.athlete_id);
                              return next;
                            });
                          }}
                          className={
                            "h-8 shrink-0 rounded-md px-3 text-[11px] font-semibold ring-1 ring-[var(--border)] " +
                            (housekeepingNonReturningIds.has(a.athlete_id)
                              ? "bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--muted-hover)]"
                              : "bg-[var(--surface-subtle)] text-[var(--muted-foreground)] hover:bg-[var(--muted-hover)]")
                          }
                          title="Toggle non-returning"
                        >
                          {housekeepingNonReturningIds.has(a.athlete_id)
                            ? "Non-returning"
                            : "Keep returning"}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            openManageAthleteFromHousekeeping(a.athlete_id);
                          }}
                          className="h-8 shrink-0 rounded-md bg-[var(--surface-subtle)] px-3 text-[11px] font-semibold text-[var(--foreground)] ring-1 ring-[var(--border)] hover:bg-[var(--muted-hover)]"
                          title="Edit athlete"
                        >
                          Edit
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

            </div>
          </div>
        </div>
      ) : null}

      <div className="space-y-1">
        <label className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
          Search recruits
        </label>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Name, event group, grad year…"
          className="h-9 w-full rounded-md bg-[var(--surface)] px-2 text-sm text-[var(--foreground)] ring-1 ring-[var(--border)] outline-none focus:ring-2 focus:ring-[var(--border)]"
        />
      </div>

      {!isManager ? (
        <p className="text-[10px] text-[var(--muted-foreground)]">
          You can view recruits, but only managers can add to scenarios.
        </p>
      ) : null}

      {error ? (
        <div className="rounded-md bg-[var(--surface)] p-2 text-[11px] text-[var(--danger)] ring-1 ring-[var(--border)]">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl bg-[var(--surface)] ring-1 ring-[var(--border)]">
        <div className="flex items-center justify-between px-3 py-2">
          <p className="text-[11px] font-semibold text-[var(--foreground)]">Recruits</p>
          <p className="text-[10px] text-[var(--muted-foreground)]">
            {loading ? "Loading…" : `${filtered.length} available`}
          </p>
        </div>

        <div className="max-h-[360px] overflow-y-auto border-t border-[var(--border)]">
          {loading ? (
            <div className="p-3 text-[11px] text-[var(--muted-foreground)]">Loading recruits…</div>
          ) : filtered.length === 0 ? (
            <div className="p-3 text-[11px] text-[var(--muted-foreground)]">No recruits found.</div>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {filtered.map((r) => {
                const label = `${r.first_name} ${r.last_name}`;
                const meta = [
                  r.event_group ? r.event_group : null,
                  r.grad_year ? `’${String(r.grad_year).slice(-2)}` : null,
                  r.pipeline_stage ? r.pipeline_stage : null,
                ].filter(Boolean);

                const disabled = !isManager || savingId === r.id;

                return (
                  <li key={r.id} className="flex items-center gap-3 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-semibold text-[var(--foreground)]">
                        {label}
                      </p>
                      {meta.length > 0 ? (
                        <p className="mt-0.5 truncate text-[10px] text-[var(--muted-foreground)]">
                          {meta.join(" • ")}
                        </p>
                      ) : (
                        <p className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">—</p>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => handleAdd(r.id)}
                      className={
                        "h-8 shrink-0 rounded-md px-3 text-[11px] font-semibold ring-1 ring-[var(--border)] " +
                        (disabled
                          ? "bg-[var(--surface-subtle)] text-[var(--muted-foreground)] opacity-60"
                          : "bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--muted-hover)]")
                      }
                      title={!isManager ? "Manager permission required" : "Add this recruit to the scenario"}
                    >
                      {savingId === r.id ? "Adding…" : "Add"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <p className="text-[10px] text-[var(--muted-foreground)]">
        Added recruits will appear in the Scenario Athletes list in the center canvas.
      </p>
    </div>
  );
}