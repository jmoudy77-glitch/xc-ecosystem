"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ScholarshipUnit = "percent" | "equivalency" | "amount";

type RosterEntry = {
  id: string;
  teamSeasonId: string;
  athleteId: string | null;
  programRecruitId: string | null;
  status: string | null;
  role: string | null;

  name: string;
  email: string | null;
  avatarUrl: string | null;

  gradYear: number | null;
  scholarshipAmount: number | null;
  scholarshipUnit: string | null; // "percent" | "equivalency" | "amount"
  scholarshipNotes: string | null;
  createdAt: string | null;

  // Event group key used for grouping on the season page (server provides this)
  eventGroup: string | null;
};

type RecruitEntry = {
  programRecruitId: string;
  athleteId: string;
  fullName: string;
  gradYear: number | null;
  status: string | null;
  profileType: string | null;
  gender: string | null;
};

type Props = {
  programId: string;
  teamId: string;
  seasonId: string;
  isManager: boolean;
  isLocked: boolean;
  teamGender: string | null;
  initialGroupQuotas: Record<string, number | null>;
  roster: RosterEntry[];
};

type AuditSortKey = "name" | "equiv" | "amount";

type ScholarshipAuditRow = {
  id: string;
  name: string;
  gradYear: number | null;
  unit: ScholarshipUnit;
  rawAmount: number | null;
  equiv: number | null;
  dollar: number | null;
  notes: string | null;
};

export default function SeasonRosterClient({
  programId,
  teamId,
  seasonId,
  isManager,
  isLocked,
  teamGender,
  initialGroupQuotas,
  roster: initialRoster,
}: Props) {
  const router = useRouter();

  const [roster, setRoster] = useState<RosterEntry[]>(initialRoster);
  const [recruits, setRecruits] = useState<RecruitEntry[]>([]);
  const [loadingRecruits, setLoadingRecruits] = useState(false);
  const [recruitsError, setRecruitsError] = useState<string | null>(null);

  // Scholarship editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>("");
  const [editUnit, setEditUnit] = useState<ScholarshipUnit>("percent");
  const [editNotes, setEditNotes] = useState<string>("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  // Event group UI state
  const [groupExpanded, setGroupExpanded] = useState<Record<string, boolean>>({});
  const [groupQuotas, setGroupQuotas] = useState<Record<string, number | null>>(
    initialGroupQuotas || {}
  );

  // Audit pane state (sorting)
  const [auditSortKey, setAuditSortKey] = useState<AuditSortKey>("equiv");
  const [auditSortDir, setAuditSortDir] = useState<"asc" | "desc">("desc");

  // Keep local roster in sync if server sends a new one
  useEffect(() => {
    setRoster(initialRoster);
  }, [initialRoster]);

  // Keep group quotas in sync with server-provided initial values
  useEffect(() => {
    setGroupQuotas(initialGroupQuotas || {});
  }, [initialGroupQuotas]);

  // Group roster entries by event group (fall back to "Unassigned")
  const groupedRoster = useMemo(() => {
    const buckets: Record<string, RosterEntry[]> = {};
    for (const entry of roster) {
      const key = entry.eventGroup || "Unassigned";
      if (!buckets[key]) buckets[key] = [];
      buckets[key].push(entry);
    }
    return Object.entries(buckets).sort(([a], [b]) => a.localeCompare(b));
  }, [roster]);

  // Ensure each group has an expansion state entry
  useEffect(() => {
    setGroupExpanded((prev) => {
      const next = { ...prev };
      for (const [key] of groupedRoster) {
        if (!(key in next)) next[key] = true;
      }
      return next;
    });
  }, [groupedRoster]);

  // Load recruits for "Add from recruits"
  async function loadRecruits() {
    setLoadingRecruits(true);
    setRecruitsError(null);

    try {
      const res = await fetch(`/api/programs/${programId}/recruits`);
      const body = await res.json();

      if (!res.ok) {
        setRecruitsError(body.error || "Failed to load recruits");
        setLoadingRecruits(false);
        return;
      }

      // Now guaranteed: body = { recruits: [...] }
      const raw = (body.recruits ?? []) as any[];

      // Build a set of program_recruit_id values already on this roster
      const alreadyOnRosterByRecruitId = new Set(
        roster
          .map((r) => r.programRecruitId)
          .filter((id): id is string => !!id)
      );

            const mapped: RecruitEntry[] = raw
              .map((r) => ({
                programRecruitId: r.program_recruit_id as string,
                athleteId: (r.athlete_id as string | null) ?? "",
                fullName: (r.full_name as string) ?? "Athlete",
                gradYear: (r.grad_year as number | null) ?? null,
                status: (r.status as string | null) ?? null,
                profileType: (r.profile_type as string | null) ?? null,
                gender: (r.gender as string | null) ?? null,
              }))
              // Require a valid program_recruit_id and filter out someone already on this roster
              .filter(
                (r) =>
                  !!r.programRecruitId &&
                  !alreadyOnRosterByRecruitId.has(r.programRecruitId)
              );

            const teamGenderNorm = teamGender?.toLowerCase();
            const genderFiltered = teamGenderNorm
              ? mapped.filter((rec) => {
                  if (!rec.gender) return true; // keep unknown gender
                  return rec.gender.toLowerCase() === teamGenderNorm;
                })
              : mapped;

            setRecruits(genderFiltered);
    } catch (e: any) {
      setRecruitsError(e?.message || "Unexpected error");
    }

    setLoadingRecruits(false);
  }

  useEffect(() => {
    loadRecruits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Scholarship editing ---

  function startEditing(entry: RosterEntry) {
    setEditingId(entry.id);
    setEditAmount(
      entry.scholarshipAmount != null ? String(entry.scholarshipAmount) : ""
    );
    const unit = (entry.scholarshipUnit as ScholarshipUnit | null) ?? "percent";
    setEditUnit(unit);
    setEditNotes(entry.scholarshipNotes ?? "");
    setEditError(null);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditAmount("");
    setEditUnit("percent");
    setEditNotes("");
    setSavingId(null);
    setEditError(null);
  }

  async function saveScholarship(entry: RosterEntry) {
    if (!editingId) return;

    const trimmed = editAmount.trim();
    let amountPayload: number | null = null;

    if (trimmed.length > 0) {
      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed)) {
        setEditError("Amount must be a valid number");
        return;
      }

      // Basic sanity checks by unit
      if (editUnit === "percent" && (parsed < 0 || parsed > 100)) {
        setEditError("Percent scholarships must be between 0 and 100.");
        return;
      }
      if ((editUnit === "equivalency" || editUnit === "amount") && parsed < 0) {
        setEditError("Scholarship cannot be negative.");
        return;
      }

      amountPayload = parsed;
    }

    setSavingId(entry.id);
    setEditError(null);

    try {
      const res = await fetch(
        `/api/programs/${programId}/teams/${teamId}/seasons/${seasonId}/roster/${entry.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scholarship_amount: amountPayload,
            scholarship_unit: editUnit,
            scholarship_notes: editNotes,
          }),
        }
      );

      const body = await res.json();

      if (!res.ok) {
        setEditError(body.error || "Failed to update scholarship");
        setSavingId(null);
        return;
      }

      // Option 1: optimistic local update
      const updatedEntry = body.entry as any;
      setRoster((prev) =>
        prev.map((r) =>
          r.id === entry.id
            ? {
                ...r,
                scholarshipAmount:
                  (updatedEntry.scholarship_amount as number | null) ?? null,
                scholarshipUnit:
                  (updatedEntry.scholarship_unit as string | null) ?? null,
                scholarshipNotes:
                  (updatedEntry.scholarship_notes as string | null) ?? null,
              }
            : r
        )
      );

      // Option 2: refresh whole page so server recomputes summary card
      router.refresh();

      cancelEditing();
    } catch (e: any) {
      setEditError(e?.message || "Unexpected error");
      setSavingId(null);
    }
  }

  // --- Audit pane derived data ---

  const auditRows = useMemo<ScholarshipAuditRow[]>(() => {
    const rows: ScholarshipAuditRow[] = [];

    for (const entry of roster) {
      if (entry.scholarshipAmount == null) continue;

      const unit = (entry.scholarshipUnit ??
        "percent") as ScholarshipUnit;
      const raw = entry.scholarshipAmount;

      let equiv: number | null = null;
      let dollar: number | null = null;

      if (unit === "percent") {
        // 100% = 1.0 equivalency
        equiv = raw / 100;
      } else if (unit === "equivalency") {
        equiv = raw;
      } else if (unit === "amount") {
        dollar = raw;
      }

      rows.push({
        id: entry.id,
        name: entry.name,
        gradYear: entry.gradYear,
        unit,
        rawAmount: raw,
        equiv,
        dollar,
        notes: entry.scholarshipNotes,
      });
    }

    // Sorting
    const sorted = [...rows];
    sorted.sort((a, b) => {
      let av: number | string | null;
      let bv: number | string | null;

      if (auditSortKey === "name") {
        av = a.name.toLowerCase();
        bv = b.name.toLowerCase();
        if (av < bv) return auditSortDir === "asc" ? -1 : 1;
        if (av > bv) return auditSortDir === "asc" ? 1 : -1;
        return 0;
      }

      if (auditSortKey === "equiv") {
        av = a.equiv ?? 0;
        bv = b.equiv ?? 0;
      } else {
        // "amount"
        av = a.dollar ?? 0;
        bv = b.dollar ?? 0;
      }

      if (av < bv) return auditSortDir === "asc" ? -1 : 1;
      if (av > bv) return auditSortDir === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [roster, auditSortKey, auditSortDir]);

  const totalEquiv = useMemo(
    () =>
      auditRows.reduce(
        (sum, row) => (row.equiv != null ? sum + row.equiv : sum),
        0
      ),
    [auditRows]
  );

  const totalDollar = useMemo(
    () =>
      auditRows.reduce(
        (sum, row) => (row.dollar != null ? sum + row.dollar : sum),
        0
      ),
    [auditRows]
  );

  function handleAuditSort(nextKey: AuditSortKey) {
    setAuditSortKey((currentKey) => {
      if (currentKey === nextKey) {
        // toggle direction on same key
        setAuditSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return currentKey;
      } else {
        setAuditSortDir("desc");
        return nextKey;
      }
    });
  }

  // --- Add from recruits ---

  async function handleAddFromRecruit(rec: RecruitEntry) {
    if (!isManager || isLocked) return;

    try {
      const res = await fetch(
        `/api/programs/${programId}/teams/${teamId}/seasons/${seasonId}/roster/add-recruit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            program_recruit_id: rec.programRecruitId,
            status: "active",
          }),
        }
      );

      const body = await res.json();

      if (!res.ok) {
        alert(body.error || "Failed to add athlete to roster");
        return;
      }

      // Remove from local recruit list
      setRecruits((prev) =>
        prev.filter((r) => r.programRecruitId !== rec.programRecruitId)
      );

      // Let the server recompute roster + scholarship summary
      router.refresh();
    } catch (e: any) {
      alert(e?.message || "Unexpected error");
    }
  }

  async function persistGroupQuotas(next: Record<string, number | null>) {
    try {
      const res = await fetch(
        `/api/programs/${programId}/teams/${teamId}/seasons/${seasonId}/event-group-quotas`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quotas: next }),
        }
      );

      if (!res.ok) {
        console.error("[SeasonRosterClient] Failed to persist group quotas");
      }
    } catch (err) {
      console.error("[SeasonRosterClient] Error persisting group quotas", err);
    }
  }

  function toggleGroup(key: string) {
    setGroupExpanded((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  function updateQuota(key: string, value: string) {
    const trimmed = value.trim();
    const parsed = trimmed === "" ? null : Number(trimmed);
    if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0)) return;

    setGroupQuotas((prev) => {
      const next = { ...prev, [key]: parsed };
      void persistGroupQuotas(next);
      return next;
    });
  }

  function formatGroupLabel(key: string) {
    if (key === "Unassigned") return "Unassigned / Other";
    return key;
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Left: main roster list */}
      <section className="md:col-span-2 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Season roster
          </p>
          {isLocked && (
            <span className="rounded-full border border-rose-500/40 bg-rose-900/40 px-2 py-0.5 text-[10px] text-rose-100">
              Roster locked — scholarships read-only
            </span>
          )}
        </div>

                {groupedRoster.length === 0 ? (
                  <p className="text-[11px] text-slate-500">
                    No athletes on this season&apos;s roster yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {groupedRoster.map(([groupKey, athletes]) => {
                      const expanded = groupExpanded[groupKey] ?? true;
                      const quota = groupQuotas[groupKey] ?? null;
                      const filled = athletes.length;

                      return (
                        <div
                          key={groupKey}
                          className="rounded-lg border border-slate-800 bg-slate-950/60"
                        >
                          {/* Group header */}
                          <button
                            type="button"
                            onClick={() => toggleGroup(groupKey)}
                            className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-slate-900/80"
                          >
                            <div>
                              <p className="text-xs font-semibold text-slate-100">
                                {formatGroupLabel(groupKey)}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                {quota !== null
                                  ? `${filled} / ${quota} positions filled`
                                  : `${filled} athletes`}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                inputMode="numeric"
                                className="w-16 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-sky-500"
                                placeholder="Quota"
                                value={quota ?? ""}
                                onChange={(e) => updateQuota(groupKey, e.target.value)}
                              />
                              <span className="text-[14px] text-slate-400">
                                {expanded ? "▾" : "▸"}
                              </span>
                            </div>
                          </button>

                          {/* Group body */}
                          {expanded && (
                            <div className="border-t border-slate-800 px-3 py-2 space-y-2">
                              {athletes.map((entry) => {
                                const isEditing = editingId === entry.id;

                                let displayScholarship: string;
                                if (entry.scholarshipAmount == null) {
                                  displayScholarship = "None";
                                } else {
                                  const unit = (entry.scholarshipUnit ??
                                    "percent") as ScholarshipUnit;
                                  if (unit === "percent") {
                                    displayScholarship = `${entry.scholarshipAmount}%`;
                                  } else if (unit === "equivalency") {
                                    displayScholarship =
                                      entry.scholarshipAmount.toString();
                                  } else {
                                    displayScholarship = `$${entry.scholarshipAmount.toLocaleString(
                                      undefined,
                                      { maximumFractionDigits: 0 }
                                    )}`;
                                  }
                                }

                                return (
                                  <div
                                    key={entry.id}
                                    className="flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 md:flex-row md:items-center md:justify-between"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-slate-100">
                                        {entry.name.charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-slate-100">
                                          {entry.name}
                                          {entry.gradYear && (
                                            <span className="ml-2 text-[10px] text-slate-400">
                                              • {entry.gradYear}
                                            </span>
                                          )}
                                        </p>
                                        <p className="text-[11px] text-slate-400">
                                          Scholarship:{" "}
                                          <span className="font-medium text-slate-100">
                                            {displayScholarship}
                                          </span>
                                          {entry.scholarshipAmount != null && (
                                            <>
                                              {entry.scholarshipUnit === "amount" &&
                                                " (amount)"}
                                              {entry.scholarshipUnit === "percent" &&
                                                " (percent)"}
                                              {entry.scholarshipUnit ===
                                                "equivalency" && " (equiv)"}
                                            </>
                                          )}
                                        </p>
                                        {entry.scholarshipNotes && (
                                          <p className="mt-0.5 text-[10px] text-slate-500">
                                            {entry.scholarshipNotes}
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    <div className="md:w-64">
                                      {isManager && !isLocked ? (
                                        <>
                                          {isEditing ? (
                                            <div className="space-y-1">
                                              <div className="flex gap-2">
                                                <input
                                                  value={editAmount}
                                                  onChange={(e) =>
                                                    setEditAmount(e.target.value)
                                                  }
                                                  placeholder={
                                                    editUnit === "percent"
                                                      ? "e.g., 75"
                                                      : editUnit === "equivalency"
                                                      ? "e.g., 0.75"
                                                      : "e.g., 8500"
                                                  }
                                                  className="w-24 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500"
                                                />
                                                <select
                                                  value={editUnit}
                                                  onChange={(e) =>
                                                    setEditUnit(
                                                      e.target.value as ScholarshipUnit
                                                    )
                                                  }
                                                  className="w-28 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500"
                                                >
                                                  <option value="percent">
                                                    % percent
                                                  </option>
                                                  <option value="equivalency">
                                                    Eq equiv
                                                  </option>
                                                  <option value="amount">
                                                    $ amount
                                                  </option>
                                                </select>
                                              </div>
                                              <textarea
                                                value={editNotes}
                                                onChange={(e) =>
                                                  setEditNotes(e.target.value)
                                                }
                                                rows={2}
                                                placeholder="Notes (optional)…"
                                                className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-100 outline-none focus:border-sky-500"
                                              />
                                              {editError && (
                                                <p className="text-[10px] text-rose-400">
                                                  {editError}
                                                </p>
                                              )}
                                              <div className="flex gap-2">
                                                <button
                                                  type="button"
                                                  onClick={() => saveScholarship(entry)}
                                                  disabled={savingId === entry.id}
                                                  className="rounded-md bg-sky-600 px-2 py-1 text-[11px] font-semibold text-slate-950 hover:bg-sky-500 disabled:opacity-60"
                                                >
                                                  {savingId === entry.id
                                                    ? "Saving…"
                                                    : "Save"}
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={cancelEditing}
                                                  className="rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-800"
                                                >
                                                  Cancel
                                                </button>
                                              </div>
                                            </div>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() => startEditing(entry)}
                                              className="w-full rounded-md border border-sky-500/60 bg-sky-900/40 px-2 py-1 text-[11px] font-semibold text-sky-100 hover:bg-sky-800/70"
                                            >
                                              Edit scholarship
                                            </button>
                                          )}
                                        </>
                                      ) : (
                                        <p className="text-[10px] text-slate-500">
                                          Scholarships read-only
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

        {/* Scholarship Audit Pane */}
        {auditRows.length > 0 && (
          <section className="mt-4 rounded-xl border border-slate-800 bg-slate-950/80 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Scholarship audit
                </p>
                <p className="mt-0.5 text-[10px] text-slate-500">
                  Breakdown of individual awards with equivalency and dollar
                  values.
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 text-[10px] text-slate-400">
                <div>
                  Total equiv:{" "}
                  <span className="font-semibold text-slate-100">
                    {totalEquiv.toFixed(2)}
                  </span>
                </div>
                <div>
                  Total amount:{" "}
                  <span className="font-semibold text-slate-100">
                    $
                    {totalDollar.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>
              </div>
            </div>

            <div className="mb-2 flex flex-wrap gap-2 text-[10px] text-slate-300">
              <span className="text-slate-500">Sort by:</span>
              <button
                type="button"
                onClick={() => handleAuditSort("name")}
                className={`rounded px-2 py-0.5 ${
                  auditSortKey === "name"
                    ? "bg-slate-800 text-sky-200"
                    : "bg-slate-900 text-slate-400"
                }`}
              >
                Name
                {auditSortKey === "name" &&
                  (auditSortDir === "asc" ? " ↑" : " ↓")}
              </button>
              <button
                type="button"
                onClick={() => handleAuditSort("equiv")}
                className={`rounded px-2 py-0.5 ${
                  auditSortKey === "equiv"
                    ? "bg-slate-800 text-sky-200"
                    : "bg-slate-900 text-slate-400"
                }`}
              >
                Equiv
                {auditSortKey === "equiv" &&
                  (auditSortDir === "asc" ? " ↑" : " ↓")}
              </button>
              <button
                type="button"
                onClick={() => handleAuditSort("amount")}
                className={`rounded px-2 py-0.5 ${
                  auditSortKey === "amount"
                    ? "bg-slate-800 text-sky-200"
                    : "bg-slate-900 text-slate-400"
                }`}
              >
                $
                {auditSortKey === "amount" &&
                  (auditSortDir === "asc" ? " ↑" : " ↓")}
              </button>
            </div>

            <div className="divide-y divide-slate-800 text-[11px]">
              {auditRows.map((row) => (
                <div
                  key={row.id}
                  className="flex flex-col gap-1 py-2 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-medium text-slate-100">
                      {row.name}
                      {row.gradYear && (
                        <span className="ml-2 text-[10px] text-slate-400">
                          • {row.gradYear}
                        </span>
                      )}
                    </p>
                    {row.notes && (
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        {row.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-300">
                    <span
                      className={`rounded-full border px-2 py-0.5 ${
                        row.unit === "amount"
                          ? "border-emerald-400/40 bg-emerald-900/40 text-emerald-100"
                          : row.unit === "equivalency"
                          ? "border-sky-400/40 bg-sky-900/40 text-sky-100"
                          : "border-slate-500/40 bg-slate-900/60 text-slate-100"
                      }`}
                    >
                      {row.unit === "percent"
                        ? `${row.rawAmount}%`
                        : row.unit === "equivalency"
                        ? `${row.rawAmount} eq`
                        : `$${row.rawAmount?.toLocaleString(undefined, {
                            maximumFractionDigits: 0,
                          })}`}
                    </span>

                    {row.equiv != null && (
                      <span className="rounded-full border border-sky-500/30 bg-sky-900/40 px-2 py-0.5 text-sky-100">
                        {row.equiv.toFixed(2)} eq
                      </span>
                    )}

                    {row.dollar != null && (
                      <span className="rounded-full border border-emerald-500/30 bg-emerald-900/40 px-2 py-0.5 text-emerald-100">
                        $
                        {row.dollar.toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </section>

      {/* Right: Add from recruits */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Add from recruits
        </p>
        <p className="mt-1 text-[11px] text-slate-500">
          This list shows recruits for this program who are marked as
          signed, enrolled, committed, or walk-ons. Adding them here will
          place them on this season&apos;s roster.
        </p>

        {recruitsError && (
          <p className="mt-2 text-[11px] text-rose-400">
            {recruitsError}
          </p>
        )}

        {loadingRecruits ? (
          <p className="mt-2 text-[11px] text-slate-500">
            Loading recruits…
          </p>
        ) : recruits.length === 0 ? (
          <p className="mt-2 text-[11px] text-slate-500">
            No eligible recruits available to add.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {recruits.map((rec) => (
              <div
                key={rec.programRecruitId}
                className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-slate-100">
                    {rec.fullName}
                    {rec.gradYear && (
                      <span className="ml-2 text-[10px] text-slate-400">
                        • {rec.gradYear}
                      </span>
                    )}
                  </p>
                  <div className="mt-0.5 flex flex-wrap gap-1 text-[10px] text-slate-400">
                    {rec.status && (
                      <span className="rounded-full border border-emerald-400/40 bg-emerald-900/40 px-2 py-0.5 text-emerald-100">
                        {rec.status}
                      </span>
                    )}
                    {rec.profileType && (
                      <span className="rounded-full border border-slate-500/40 bg-slate-900/60 px-2 py-0.5">
                        {rec.profileType}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!isManager || isLocked}
                  onClick={() => handleAddFromRecruit(rec)}
                  className="rounded-md border border-sky-500 bg-sky-600 px-3 py-1 text-[11px] font-semibold text-slate-950 hover:bg-sky-500 disabled:opacity-60"
                >
                  Add to roster
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}