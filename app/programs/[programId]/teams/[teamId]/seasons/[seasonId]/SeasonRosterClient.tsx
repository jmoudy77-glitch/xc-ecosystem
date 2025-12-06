"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import SeasonBudgetControls from "./SeasonBudgetControls";
import ScholarshipWhatIf from "./ScholarshipWhatIf";

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
  scholarshipUnit: string | null;
  scholarshipNotes: string | null;
  createdAt: string | null;
  eventGroup?: string | null; // if you already have this, keep it
  events?: { eventCode: string; isPrimary: boolean }[];
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

type ScholarshipSummary = {
  hasBudget: boolean;
  budgetEquiv: number | null;
  usedEquiv: number | null;
  remainingEquiv: number | null;
  budgetAmount: number | null;
  usedAmount: number | null;
  remainingAmount: number | null;
};

type BudgetHistoryRow = {
  id: string;
  timestamp: string;
  coach: string;
  oldEquiv: number | null;
  newEquiv: number | null;
  oldAmount: number | null;
  newAmount: number | null;
  notes: string | null;
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

  // Scholarship budget tools
  scholarshipSummary: ScholarshipSummary;
  budgetHistory: BudgetHistoryRow[];
  initialBudgetEquiv: number | null;
  initialBudgetAmount: number | null;
  budgetCurrency: string;
  initialSeasonLocked: boolean; // coach lock state for SeasonBudgetControls
};

type AuditSortKey = "name" | "equiv" | "amount";

type ActiveTool = "none" | "recruits" | "audit" | "budget";

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

function formatCurrency(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "-";
  return `$${Number(value).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  })}`;
}

export default function SeasonRosterClient({
  programId,
  teamId,
  seasonId,
  isManager,
  isLocked,
  teamGender,
  initialGroupQuotas,
  roster: initialRoster,
  scholarshipSummary,
  budgetHistory,
  initialBudgetEquiv,
  initialBudgetAmount,
  budgetCurrency,
  initialSeasonLocked,
}: Props) {
  const router = useRouter();

  const [roster, setRoster] = useState<RosterEntry[]>(initialRoster);
  const [recruits, setRecruits] = useState<RecruitEntry[]>([]);
  const [loadingRecruits, setLoadingRecruits] = useState(false);
  const [recruitsError, setRecruitsError] = useState<string | null>(null);


  // Event group UI state
  const [groupExpanded, setGroupExpanded] = useState<Record<string, boolean>>({});
  const [groupQuotas, setGroupQuotas] = useState<Record<string, number | null>>(
    initialGroupQuotas || {}
  );
  // Drag-and-drop removal confirmation state
  const [pendingRemovalRosterId, setPendingRemovalRosterId] =
    useState<string | null>(null);
  const [pendingRemovalName, setPendingRemovalName] = useState<string | null>(
    null
  );
  // Drag hover state for slot placeholders
  const [hoverSlotKey, setHoverSlotKey] = useState<string | null>(null);
    // Avatar upload state
  const [avatarUploadingId, setAvatarUploadingId] = useState<string | null>(null);

  async function handleAvatarUpload(entry: RosterEntry, file: File) {
  if (!entry.athleteId) return;

  try {
    setAvatarUploadingId(entry.id);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("athleteId", entry.athleteId);

    const res = await fetch(`/api/athletes/${entry.athleteId}/avatar`, {
      method: "POST",
      body: formData,
    });

    let body: any = null;
    try {
      body = await res.json();
    } catch {
      // ignore JSON parse errors
    }

    if (!res.ok) {
      console.error(
        "[SeasonRosterClient] Avatar upload failed",
        res.status,
        body
      );
      if (body?.error) {
        alert(`Avatar upload failed: ${body.error}`);
      } else {
        alert(`Avatar upload failed (status ${res.status})`);
      }
      return;
    }

    // Success: refresh to pull new avatarUrl
    router.refresh();
  } catch (err) {
    console.error("[SeasonRosterClient] Error uploading avatar", err);
    alert("Unexpected error uploading avatar – check console for details.");
  } finally {
    setAvatarUploadingId(null);
  }
}

  // Audit pane state (sorting)
  const [auditSortKey, setAuditSortKey] = useState<AuditSortKey>("equiv");
  const [auditSortDir, setAuditSortDir] = useState<"asc" | "desc">("desc");

  const [activeTool, setActiveTool] = useState<ActiveTool>("none");

  const isToolPanelOpen = activeTool !== "none";


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

  // --- Scholarship focus for slide-out ---
  function handleFocusScholarship(rosterId: string) {
    // TODO: wire this to the scholarships tools slide-out
    console.log(
      "[SeasonRosterClient] Focus scholarship for roster entry",
      rosterId
    );
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

  async function handleAddFromRecruit(
    rec: RecruitEntry,
    eventGroup?: string | null
  ) {
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
            event_group: eventGroup ?? null,
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

  async function handleRemoveFromRoster(rosterId: string) {
    if (!isManager || isLocked) return;

    try {
      const res = await fetch(
        `/api/programs/${programId}/teams/${teamId}/seasons/${seasonId}/roster/${rosterId}`,
        {
          method: "DELETE",
        }
      );

      let body: any = null;
      try {
        body = await res.json();
      } catch {
        // ignore JSON parse errors; some DELETE handlers may return no body
      }

      if (!res.ok) {
        const msg = body?.error || body?.message || "Failed to remove athlete";
        alert(msg);
        return;
      }

      setPendingRemovalRosterId(null);
      setPendingRemovalName(null);

      // Let the server recompute roster + scholarship summary + recruits
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
    <div className="flex flex-col gap-4 md:flex-row">
      {/* Main content: tools bar + roster + audit */}
      <div className={isToolPanelOpen ? "w-full md:flex-1" : "w-full"}>
        {/* Header + lock status */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase text-[24px] tracking-wide text-slate-400">
            Season roster
          </p>
          {isLocked && (
            <span className="rounded-full border border-rose-500/40 bg-rose-900/40 px-2 py-0.5 text-[10px] text-rose-100">
              Roster locked — scholarships read-only
            </span>
          )}
        </div>

        {/* Tools bar */}
        <div className="mb-1 mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
          <span className="text-slate-500">Tools:</span>

          {/* Recruits tool toggle */}
          <button
            type="button"
            onClick={() =>
              setActiveTool((current) =>
                current === "recruits" ? "none" : "recruits"
              )
            }
            className={`rounded-full border px-3 py-0.5 text-[11px] transition-colors ${
              activeTool === "recruits"
                ? "border-sky-400/60 bg-sky-900/60 text-sky-100"
                : "border-slate-700 bg-slate-900/80 text-slate-300 hover:border-sky-500/60 hover:text-sky-100"
            }`}
          >
            Recruits
          </button>

          {/* Scholarship budget tool toggle */}
          <button
            type="button"
            onClick={() =>
              setActiveTool((current) =>
                current === "budget" ? "none" : "budget"
              )
            }
            className={`rounded-full border px-3 py-0.5 text-[11px] transition-colors ${
              activeTool === "budget"
                ? "border-amber-400/60 bg-amber-900/60 text-amber-100"
                : "border-slate-700 bg-slate-900/80 text-slate-300 hover:border-amber-400/60 hover:text-amber-100"
            }`}
          >
            Scholarship budget
          </button>

          {/* Scholarship audit tool toggle */}
          <button
            type="button"
            onClick={() =>
              setActiveTool((current) =>
                current === "audit" ? "none" : "audit"
              )
            }
            className={`rounded-full border px-3 py-0.5 text-[11px] transition-colors ${
              activeTool === "audit"
                ? "border-emerald-400/60 bg-emerald-900/60 text-emerald-100"
                : "border-slate-700 bg-slate-900/80 text-slate-300 hover:border-emerald-400/60 hover:text-emerald-100"
            }`}
          >
            Scholarship audit
          </button>
        </div>

        {/* Roster groups */}
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
              const emptySlots = quota !== null ? Math.max(quota - filled, 0) : 0;

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
                    <div
                      className="border-t border-slate-800 px-3 py-2 flex flex-wrap gap-3"
                    >
                      {athletes.map((entry) => {
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
                            className="flex w-72 max-w-full flex-col rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2"
                            style={{
                              aspectRatio: "2 / 3.75", // width / height; ~1.875:1 height/width
                            }}
                            draggable={isManager && !isLocked}
                            onDragStart={(e) => {
                              if (!isManager || isLocked) return;
                              try {
                                e.dataTransfer.setData(
                                  "text/plain",
                                  `roster:${entry.id}`
                                );
                                e.dataTransfer.effectAllowed = "move";
                              } catch {
                                // ignore
                              }
                            }}
                            onDragEnd={(e) => {
                              // no-op for now; hook available for future visual feedback
                            }}
                          >
                            {/* Top row: photo + bio/events */}
                            <div className="flex gap-3">
                              <div
                                className="relative overflow-hidden rounded-md bg-slate-800 text-xs font-semibold text-slate-100 cursor-pointer basis-[35%]"
                                style={{
                                  aspectRatio: "2 / 3.75", // same as the card: width / height (~1.875:1 height/width)
                                }}
                                onClick={(e) => {
                                  const input = e.currentTarget.querySelector<HTMLInputElement>(
                                    'input[type="file"]'
                                  );
                                  if (input) input.click();
                                }}
                              >
                                {entry.avatarUrl ? (
                                  <img
                                    src={entry.avatarUrl}
                                    alt={entry.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center">
                                    {entry.name.charAt(0).toUpperCase()}
                                  </div>
                                )}

                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    void handleAvatarUpload(entry, file);
                                  }}
                                />

                                {avatarUploadingId === entry.id && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 text-[10px] text-slate-100">
                                    Uploading…
                                  </div>
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-xs md:text-sm font-medium text-slate-100">
                                    {entry.name}
                                    {entry.gradYear && (
                                      <span className="ml-2 text-[10px] text-slate-400">
                                        • {entry.gradYear}
                                      </span>
                                    )}
                                  </p>
                                </div>
                                <div className="mt-0.5 flex flex-wrap gap-1 text-[9px] md:text-[10px] text-slate-400">
                                  {entry.eventGroup && (
                                    <span className="rounded-full border border-sky-400/40 bg-sky-900/40 px-2 py-0.5 text-sky-100">
                                      {entry.eventGroup}
                                    </span>
                                  )}
                                  {entry.status && (
                                    <span className="rounded-full border border-slate-500/40 bg-slate-900/60 px-2 py-0.5">
                                      {entry.status}
                                    </span>
                                  )}
                                </div>
                                {entry.events && entry.events.length > 0 && (
                                  <p className="mt-0.5 text-[9px] md:text-[10px] text-slate-400">
                                    Events:{" "}
                                    {entry.events
                                      .map((ev) =>
                                        ev.isPrimary
                                          ? `${ev.eventCode} (primary)`
                                          : ev.eventCode
                                      )
                                      .join(", ")}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Scholarship line full width */}
                            <div className="mt-1 border-t border-slate-800 pt-1">
                              <p className="text-[10px] md:text-[11px] text-slate-400">
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
                                    {entry.scholarshipUnit === "equivalency" &&
                                      " (equiv)"}
                                  </>
                                )}
                              </p>
                              {isManager && !isLocked && (
                                <button
                                  type="button"
                                  className="mt-0.5 text-[10px] text-sky-300 hover:underline"
                                  onClick={() => handleFocusScholarship(entry.id)}
                                >
                                  Adjust scholarship…
                                </button>
                              )}
                            </div>

                            {/* Coach's notes full width below */}
                            {entry.scholarshipNotes && (
                              <p className="mt-0.5 text-[10px] text-slate-500">
                                {entry.scholarshipNotes}
                              </p>
                            )}
                          </div>
                        );
                      })}
                      {Array.from({ length: emptySlots }).map((_, idx) => {
                        const slotKey = `${groupKey}-${idx}`;
                        const isHover = hoverSlotKey === slotKey;

                        return (
                          <div
                            key={`slot-${groupKey}-${idx}`}
                            className={`flex w-72 max-w-full flex-col items-center justify-center rounded-lg px-3 py-2 text-center transition-colors ${
                              isHover
                                ? "border border-sky-400 bg-sky-900/50"
                                : "border border-dashed border-slate-700 bg-slate-900/40"
                            }`}
                            style={{
                              aspectRatio: "2 / 3.75",
                            }}
                            onDragOver={(e) => {
                              if (!isManager || isLocked) return;
                              // For reliable drop, just prevent default when manager can edit
                              e.preventDefault();
                              e.dataTransfer.dropEffect = "copy";
                            }}
                            onDragEnter={() => {
                              if (!isManager || isLocked) return;
                              setHoverSlotKey(slotKey);
                            }}
                            onDragLeave={() => {
                              if (!isManager || isLocked) return;
                              setHoverSlotKey((current) =>
                                current === slotKey ? null : current
                              );
                            }}
                            onDrop={(e) => {
                              if (!isManager || isLocked) return;
                              try {
                                e.preventDefault();
                                const payload = e.dataTransfer.getData("text/plain");
                                if (!payload.startsWith("recruit:")) return;
                                const recruitId = payload.slice("recruit:".length);
                                const rec = recruits.find(
                                  (r) => r.programRecruitId === recruitId
                                );
                                if (rec) {
                                  void handleAddFromRecruit(rec, groupKey);
                                }
                              } catch {
                                // ignore
                              } finally {
                                setHoverSlotKey((current) =>
                                  current === slotKey ? null : current
                                );
                              }
                            }}
                          >
                            <span className="text-[10px] md:text-[11px] font-medium text-slate-500">
                              Slot available
                            </span>
                            {quota !== null && (
                              <span className="mt-0.5 text-[9px] text-slate-600">
                                Event group position
                              </span>
                            )}
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

      </div>

      {/* Right-hand tools panel (option A: pushes roster when open) */}
      {isToolPanelOpen && (
        <aside
          className="w-full md:w-80 md:shrink-0 rounded-xl border border-slate-800 bg-slate-950/90 p-4"
          onDragOver={(e) => {
            if (!isManager || isLocked) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
          }}
          onDrop={(e) => {
            if (!isManager || isLocked) return;
            try {
              const payload = e.dataTransfer.getData("text/plain");
              if (!payload.startsWith("roster:")) return;
              e.preventDefault();
              const rosterId = payload.slice("roster:".length);
              const entry = roster.find((r) => r.id === rosterId) || null;
              setPendingRemovalRosterId(rosterId);
              setPendingRemovalName(entry?.name ?? null);
            } catch {
              // ignore
            }
          }}
        >
          {activeTool === "recruits" && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Add from recruits
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                This list shows recruits for this program who are marked as
                signed, enrolled, committed, or walk-ons. Adding them here will
                place them on this season&apos;s roster.
              </p>

              {recruitsError && (
                <p className="mt-2 text-[11px] text-rose-400">{recruitsError}</p>
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
                      draggable={isManager && !isLocked}
                      onDragStart={(e) => {
                        if (!isManager || isLocked) return;
                        try {
                          e.dataTransfer.setData(
                            "text/plain",
                            `recruit:${rec.programRecruitId}`
                          );
                          e.dataTransfer.effectAllowed = "copyMove";
                        } catch {
                          // ignore
                        }
                      }}
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
            </>
          )}

          {activeTool === "budget" && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Scholarship budget
              </p>

              {/* Equivalency usage bar */}
                  {scholarshipSummary.budgetEquiv !== null &&
                    scholarshipSummary.usedEquiv !== null && (
                      <div className="mt-3">
                        <div className="mb-1 flex items-center justify-between text-[12px] text-slate-400">
                          <span>Equivalencies used</span>
                          <span>
                            {scholarshipSummary.usedEquiv.toFixed(2)} /{" "}
                            {scholarshipSummary.budgetEquiv.toFixed(2)}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className={`h-full rounded-full ${
                              scholarshipSummary.usedEquiv >
                              (scholarshipSummary.budgetEquiv ?? 0)
                                ? "bg-rose-500"
                                : "bg-emerald-500"
                            }`}
                            style={{
                              width: `${
                                Math.min(
                                  (scholarshipSummary.usedEquiv /
                                    (scholarshipSummary.budgetEquiv || 1)) *
                                    100,
                                  120
                                ) || 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

              {!scholarshipSummary.hasBudget ? (
                <p className="mt-1 text-[11px] text-slate-500">
                  No scholarship budget has been set for this season yet. Use the controls
                  below to establish your budget.
                </p>
              ) : (
                <div className="mt-2 space-y-1 text-[11px] text-slate-200">
                  {scholarshipSummary.budgetEquiv !== null && (
                    <p>
                      Equivalency budget:{" "}
                      <span className="font-semibold">
                        {scholarshipSummary.budgetEquiv.toFixed(2)} eq
                      </span>
                      {scholarshipSummary.usedEquiv !== null && (
                        <>
                          {" "}• Committed{" "}
                          <span className="font-semibold">
                            {scholarshipSummary.usedEquiv.toFixed(2)} eq
                          </span>
                          {scholarshipSummary.remainingEquiv !== null && (
                            <>
                              {" "}• Remaining{" "}
                              <span className="font-semibold">
                                {scholarshipSummary.remainingEquiv.toFixed(2)} eq
                              </span>
                            </>
                          )}
                        </>
                      )}
                    </p>
                  )}

                  {/* Dollar usage bar */}
                  {scholarshipSummary.budgetAmount !== null &&
                    scholarshipSummary.usedAmount !== null && (
                      <div className="mt-3">
                        <div className="mb-1 flex items-center justify-between text-[12px] text-slate-400">
                          <span>Dollar usage</span>
                          <span>
                            {formatCurrency(scholarshipSummary.usedAmount)} /{" "}
                            {formatCurrency(scholarshipSummary.budgetAmount)}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className={`h-full rounded-full ${
                              scholarshipSummary.usedAmount >
                              (scholarshipSummary.budgetAmount ?? 0)
                                ? "bg-rose-500"
                                : "bg-emerald-500"
                            }`}
                            style={{
                              width: `${
                                Math.min(
                                  (scholarshipSummary.usedAmount /
                                    (scholarshipSummary.budgetAmount || 1)) *
                                    100,
                                  120
                                ) || 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                  {scholarshipSummary.budgetAmount !== null && (
                    <p>
                      Dollar budget:{" "}
                      <span className="font-semibold">
                        {formatCurrency(scholarshipSummary.budgetAmount)}
                      </span>
                      {scholarshipSummary.usedAmount !== null && (
                        <>
                          {" "}• Committed{" "}
                          <span className="font-semibold">
                            {formatCurrency(scholarshipSummary.usedAmount)}
                          </span>
                          {scholarshipSummary.remainingAmount !== null && (
                            <>
                              {" "}• Remaining{" "}
                              <span className="font-semibold">
                                {formatCurrency(scholarshipSummary.remainingAmount)}
                              </span>
                            </>
                          )}
                        </>
                      )}
                    </p>
                  )}
                </div>
              )}

              {/* Budget controls */}
              <div className="mt-3">
                <SeasonBudgetControls
                  programId={programId}
                  teamId={teamId}
                  seasonId={seasonId}
                  initialEquiv={initialBudgetEquiv}
                  initialAmount={initialBudgetAmount}
                  currency={budgetCurrency}
                  initialIsLocked={initialSeasonLocked}
                />
              </div>

              {/* What-if calculator */}
              <div className="mt-4">
                <ScholarshipWhatIf
                  budgetEquiv={scholarshipSummary.budgetEquiv}
                  budgetAmount={scholarshipSummary.budgetAmount}
                  usedEquiv={scholarshipSummary.usedEquiv}
                  usedAmount={scholarshipSummary.usedAmount}
                  currency={budgetCurrency}
                />
              </div>

              {/* Recent history */}
              {budgetHistory.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Recent changes
                    </p>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/programs/${programId}/teams/${teamId}/seasons/${seasonId}/scholarship-history`}
                        className="text-[10px] text-sky-300 hover:underline"
                      >
                        View full history
                      </Link>
                      <Link
                        href={`/api/programs/${programId}/teams/${teamId}/seasons/${seasonId}/scholarship-history/export`}
                        className="rounded-md border border-sky-600 bg-sky-900/40 px-2 py-1 text-[10px] text-sky-200 hover:bg-sky-800/60"
                      >
                        Export CSV
                      </Link>
                    </div>
                  </div>

                  <div className="max-h-48 space-y-1 overflow-y-auto text-[10px]">
                    {budgetHistory.slice(0, 5).map((h) => {
                      const eqDiff =
                        h.newEquiv !== null && h.oldEquiv !== null
                          ? Number(h.newEquiv - h.oldEquiv)
                          : null;
                      const amtDiff =
                        h.newAmount !== null && h.oldAmount !== null
                          ? Number(h.newAmount - h.oldAmount)
                          : null;

                      return (
                        <div
                          key={h.id}
                          className="rounded-md border border-slate-800 bg-slate-950/60 p-2"
                        >
                          <p className="text-slate-300">
                            <span className="font-semibold text-slate-100">
                              {new Date(h.timestamp).toLocaleString()}
                            </span>{" "}
                            — {h.coach}
                          </p>
                          <div className="mt-1 grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-slate-400">Equiv: </span>
                              {h.oldEquiv} → {h.newEquiv}{" "}
                              {eqDiff !== null && (
                                <span
                                  className={
                                    eqDiff > 0
                                      ? "text-emerald-300"
                                      : eqDiff < 0
                                      ? "text-rose-300"
                                      : "text-slate-400"
                                  }
                                >
                                  ({eqDiff > 0 ? "+" : ""}
                                  {eqDiff})
                                </span>
                              )}
                            </div>
                            <div>
                              <span className="text-slate-400">Amount: </span>
                              {formatCurrency(h.oldAmount)} →{" "}
                              {formatCurrency(h.newAmount)}{" "}
                              {amtDiff !== null && (
                                <span
                                  className={
                                    amtDiff > 0
                                      ? "text-emerald-300"
                                      : amtDiff < 0
                                      ? "text-rose-300"
                                      : "text-slate-400"
                                  }
                                >
                                  ({amtDiff > 0 ? "+" : ""}
                                  {formatCurrency(amtDiff)})
                                </span>
                              )}
                            </div>
                          </div>
                          {h.notes && (
                            <p className="mt-1 text-[9px] text-slate-500">
                              Notes: {h.notes}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {activeTool === "audit" && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Scholarship audit
              </p>
              {auditRows.length === 0 ? (
                <p className="mt-1 text-[11px] text-slate-500">
                  No scholarships recorded yet for this roster.
                </p>
              ) : (
                <>
                  <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-slate-400">
                    <div>
                      <p className="text-[10px] text-slate-500">
                        Breakdown of individual awards with equivalency and
                        dollar values.
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
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

                  <div className="mt-2 mb-2 flex flex-wrap gap-2 text-[10px] text-slate-300">
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

                  <div className="mt-1 max-h-80 space-y-2 overflow-y-auto text-[11px]">
                    {auditRows.map((row) => (
                      <div
                        key={row.id}
                        className="rounded-md border border-slate-800 bg-slate-950/70 p-2"
                      >
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
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-300">
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
                </>
              )}
            </>
          )}
        </aside>
      )}
       

      {pendingRemovalRosterId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70">
          <div className="w-full max-w-sm rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100">
            <p className="text-sm font-semibold">Remove from roster?</p>
            <p className="mt-1 text-[11px] text-slate-300">
              {pendingRemovalName
                ? `This will remove ${pendingRemovalName} from this season's roster and return them to the recruiting pool.`
                : "This will remove the selected athlete from this season's roster and return them to the recruiting pool."}
            </p>
            <p className="mt-1 text-[10px] text-amber-300">
              This action cannot be undone from this page.
            </p>
            <div className="mt-3 flex justify-end gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => {
                  setPendingRemovalRosterId(null);
                  setPendingRemovalName(null);
                }}
                className="rounded-md border border-slate-600 px-3 py-1 text-slate-200 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (pendingRemovalRosterId) {
                    void handleRemoveFromRoster(pendingRemovalRosterId);
                  }
                }}
                className="rounded-md bg-rose-600 px-3 py-1 font-semibold text-slate-950 hover:bg-rose-500"
              >
                Remove from roster
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}