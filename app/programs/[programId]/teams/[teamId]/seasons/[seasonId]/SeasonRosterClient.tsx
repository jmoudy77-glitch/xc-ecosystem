"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import SeasonBudgetControls from "./SeasonBudgetControls";
import ScholarshipWhatIf from "./ScholarshipWhatIf";
import { Avatar } from "@/components/Avatar";

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

type ActiveTool = "none" | "recruits" | "budget";

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

// Gender normalization helper
function normalizeGender(value: string | null | undefined): "men" | "women" | null {
  if (!value) return null;
  const v = value.toLowerCase().trim();

  // Handle common variants
  if (["m", "male", "man", "mens", "men", "boys", "boy"].some((g) => v.startsWith(g))) {
    return "men";
  }
  if (
    ["f", "female", "woman", "womens", "women", "girls", "girl"].some((g) =>
      v.startsWith(g)
    )
  ) {
    return "women";
  }

  return null;
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
  const [recruitGenderFilter, setRecruitGenderFilter] =
    useState<"program" | "all">("program");
  const [previewRecruitId, setPreviewRecruitId] = useState<string | null>(null);
  const [previewRecruitRect, setPreviewRecruitRect] = useState<{
    top: number;
    left: number;
  } | null>(null);


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

  // Per-athlete scholarship edit state
  const [editingScholarshipRosterId, setEditingScholarshipRosterId] =
    useState<string | null>(null);
  const [editingScholarshipName, setEditingScholarshipName] = useState<string | null>(
    null
  );
  const [editingScholarshipAmount, setEditingScholarshipAmount] =
    useState<string>("");
  const [editingScholarshipUnit, setEditingScholarshipUnit] =
    useState<ScholarshipUnit>("percent");
  const [editingScholarshipNotes, setEditingScholarshipNotes] =
    useState<string>("");
  const [savingScholarship, setSavingScholarship] = useState(false);
  const [scholarshipError, setScholarshipError] = useState<string | null>(null);

  // Memoized preview recruit for peek card overlay
  const previewRecruit = useMemo(
    () =>
      recruits.find((r) => r.programRecruitId === previewRecruitId) ?? null,
    [recruits, previewRecruitId]
  );

  async function handleAvatarUpload(entry: RosterEntry, file: File) {
    if (!entry.athleteId) return;

    try {
      setAvatarUploadingId(entry.id);

      const formData = new FormData();
      formData.append("file", file);

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

  // Collapsible scholarship sections in the tools panel
  const [showBudgetControls, setShowBudgetControls] = useState(true);
  const [showWhatIf, setShowWhatIf] = useState(true);
  const [showScholarshipAudit, setShowScholarshipAudit] = useState(false);


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

            // Store the full list; gender filtering is handled in the recruits aside toggle.
            setRecruits(mapped);
    } catch (e: any) {
      setRecruitsError(e?.message || "Unexpected error");
    }

    setLoadingRecruits(false);
  }

  useEffect(() => {
    loadRecruits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Scholarship focus for edit modal ---
  function handleFocusScholarship(rosterId: string) {
    if (!isManager || isLocked) return;

    const entry = roster.find((r) => r.id === rosterId);
    if (!entry) return;

    setEditingScholarshipRosterId(entry.id);
    setEditingScholarshipName(entry.name);
    setEditingScholarshipAmount(
      entry.scholarshipAmount != null ? String(entry.scholarshipAmount) : ""
    );
    setEditingScholarshipUnit(
      ((entry.scholarshipUnit as ScholarshipUnit | null) ?? "percent")
    );
    setEditingScholarshipNotes(entry.scholarshipNotes ?? "");
    setScholarshipError(null);
  }

  async function handleSaveScholarshipEdit() {
    if (!editingScholarshipRosterId) return;
    if (!isManager || isLocked) return;

    try {
      setSavingScholarship(true);
      setScholarshipError(null);

      const trimmed = editingScholarshipAmount.trim();
      let amount: number | null = null;

      if (trimmed !== "") {
        const parsed = Number(trimmed);
        if (!Number.isFinite(parsed) || parsed < 0) {
          setScholarshipError(
            "Scholarship amount must be a non-negative number."
          );
          setSavingScholarship(false);
          return;
        }
        amount = parsed;
      }

      const payload: Record<string, unknown> = {
        scholarship_unit: editingScholarshipUnit,
        scholarship_notes: editingScholarshipNotes.trim() || null,
      };

      // Explicitly send null when clearing the amount
      payload.scholarship_amount = amount;

      const res = await fetch(
        `/api/programs/${programId}/teams/${teamId}/seasons/${seasonId}/roster/${editingScholarshipRosterId}/scholarship`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      let body: any = null;
      try {
        body = await res.json();
      } catch {
        // ignore JSON parse errors
      }

      if (!res.ok) {
        const msg =
          body?.error ||
          body?.message ||
          "Failed to update scholarship for this athlete.";
        setScholarshipError(msg);
        return;
      }

      // Success: close modal and refresh data
      setEditingScholarshipRosterId(null);
      setEditingScholarshipName(null);
      setEditingScholarshipAmount("");
      setEditingScholarshipNotes("");
      setScholarshipError(null);

      router.refresh();
    } catch (err: any) {
      setScholarshipError(
        err?.message || "Unexpected error updating scholarship."
      );
    } finally {
      setSavingScholarship(false);
    }
  }

  function handleCancelScholarshipEdit() {
    setEditingScholarshipRosterId(null);
    setEditingScholarshipName(null);
    setEditingScholarshipAmount("");
    setEditingScholarshipNotes("");
    setScholarshipError(null);
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
    <div className="flex flex-col gap-4 md:flex-row md:items-stretch">
      {/* Main content: tools bar + roster + audit */}
      <div className="w-full md:flex-1">
        {/* Header + lock status removed, now handled below */}

        {/* Header + Tools */}
        <div className="mb-3 flex flex-col md:flex-row md:items-center md:justify-between">
          {/* Left side: Title + Lock */}
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold uppercase tracking-wide text-slate-300">
              Season Roster
            </h1>
            {isLocked && (
              <span className="rounded-full border border-rose-500/40 bg-rose-900/40 px-2 py-0.5 text-[10px] text-rose-100">
                Locked
              </span>
            )}
          </div>

          {/* Right side: tools */}
          <div className="mt-2 flex flex-wrap items-center gap-2 md:mt-0">
            <span className="text-[10px] uppercase tracking-wide text-slate-500">
              Tools:
            </span>

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
                  : "border-slate-700 bg-slate-900/80 text-slate-300 hover:border-sky-400/60 hover:text-sky-100"
              }`}
            >
              Recruits
            </button>

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
              Scholarship tools
            </button>
          </div>
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
                                <Avatar
                                  src={entry.avatarUrl || undefined}
                                  name={entry.name}
                                  size="lg"
                                  variant="square"
                                  bordered={false}
                                  className="h-full w-full"
                                />

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

      {/* Right-hand tools panel: animated, pushes roster when open */}
      <aside
        className={`w-full md:shrink-0 rounded-xl border bg-[radial-gradient(circle_at_top,_#020617,_#020617_40%,_#020617_80%)]/95 transition-all duration-500 ${
          isToolPanelOpen
            ? "md:w-80 border-slate-800 px-4 py-4 opacity-100"
            : "md:w-0 border-transparent px-0 py-0 opacity-0 pointer-events-none"
        }`}
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
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Tools panel
          </p>
          <button
            type="button"
            onClick={() => setActiveTool("none")}
            className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-100"
          >
            <span>◀</span>
            <span>Hide tools</span>
          </button>
        </div>

        {activeTool === "recruits" && (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Add from recruits
            </p>
            <div className="mt-3 rounded-md border border-dashed border-slate-700 bg-slate-950/40 px-3 py-2 text-[11px] text-slate-400">
              <p className="font-semibold text-slate-200">
                Drag here to remove from roster
              </p>
              <p className="mt-0.5">
                Drag a roster card onto this panel to remove the athlete from this
                season&apos;s roster. They&apos;ll remain in your recruit pool.
              </p>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              This list shows recruits for this program who are marked as
              signed, enrolled, committed, or walk-ons. Adding them here will
              place them on this season&apos;s roster.
            </p>

            {/* Gender filter (only shown if team has a gender) */}
            {teamGender && (
              <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                <span>Filter:</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRecruitGenderFilter("program")}
                    className={`rounded-full px-2 py-0.5 ${
                      recruitGenderFilter === "program"
                        ? "bg-sky-700 text-sky-100"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {teamGender} only
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecruitGenderFilter("all")}
                    className={`rounded-full px-2 py-0.5 ${
                      recruitGenderFilter === "all"
                        ? "bg-sky-700 text-sky-100"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    All
                  </button>
                </div>
              </div>
            )}

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
                {recruits
                  .filter((rec) => {
                    if (recruitGenderFilter === "all") return true;
                    const teamGenderNorm = normalizeGender(teamGender);
                    if (!teamGenderNorm) return true;
                    const recGenderNorm = normalizeGender(rec.gender);
                    if (!recGenderNorm) return true;
                    return recGenderNorm === teamGenderNorm;
                  })
                  .map((rec) => (
                    <div
                      key={rec.programRecruitId}
                      data-recruit-id={rec.programRecruitId}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                        previewRecruitId === rec.programRecruitId
                          ? "border border-amber-400 bg-slate-950/70"
                          : "border border-slate-800 bg-slate-950/70"
                      }`}
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
                          {rec.gender && (
                            <span className="rounded-full border border-slate-500/40 bg-slate-900/60 px-2 py-0.5">
                              {rec.gender}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            const rowEl = e.currentTarget.closest(
                              "[data-recruit-id]"
                            ) as HTMLElement | null;
                            if (rowEl) {
                              const rect = rowEl.getBoundingClientRect();
                              setPreviewRecruitRect({
                                top: rect.top,
                                left: rect.left,
                              });
                            } else {
                              setPreviewRecruitRect(null);
                            }
                            setPreviewRecruitId(rec.programRecruitId);
                          }}
                          className="rounded-md border border-sky-500 bg-sky-600 px-3 py-1 text-[11px] font-semibold text-slate-950 hover:bg-sky-500"
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  ))}
                {previewRecruit && previewRecruitRect && (
                  <div
                    className="fixed z-30"
                    style={{
                      top: previewRecruitRect.top,
                      left: Math.max(previewRecruitRect.left - 288, 8),
                    }}
                  >
                    <div
                      className="flex w-72 max-w-full flex-col rounded-lg border border-amber-400 bg-slate-900/70 px-3 py-2 shadow-xl"
                      style={{ aspectRatio: "2 / 3.75" }}
                      draggable={isManager && !isLocked}
                      onDragStart={(e) => {
                        if (!isManager || isLocked || !previewRecruit) return;
                        try {
                          e.dataTransfer.setData(
                            "text/plain",
                            `recruit:${previewRecruit.programRecruitId}`
                          );
                          e.dataTransfer.effectAllowed = "copyMove";
                        } catch {
                          // ignore
                        }
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-900">
                          Recruit details
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewRecruitId(null);
                            setPreviewRecruitRect(null);
                          }}
                          className="text-[11px] text-slate-900 hover:text-slate-800"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="mt-2 flex gap-3">
                        <div
                          className="relative overflow-hidden rounded-md bg-slate-800 text-xs font-semibold text-slate-100 basis-[35%]"
                          style={{ aspectRatio: "2 / 3.75" }}
                        >
                          <Avatar
                            src={undefined}
                            name={previewRecruit.fullName}
                            size="lg"
                            variant="square"
                            bordered={false}
                            className="h-full w-full"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs md:text-sm font-medium text-slate-900">
                            {previewRecruit.fullName}
                            {previewRecruit.gradYear && (
                              <span className="ml-2 text-[10px] text-slate-800">
                                • {previewRecruit.gradYear}
                              </span>
                            )}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1 text-[9px] md:text-[10px] text-slate-800">
                            {previewRecruit.status && (
                              <span className="rounded-full border border-emerald-600/60 bg-emerald-200/80 px-2 py-0.5 text-emerald-900">
                                {previewRecruit.status}
                              </span>
                            )}
                            {previewRecruit.profileType && (
                              <span className="rounded-full border border-slate-500/60 bg-slate-200/80 px-2 py-0.5 text-slate-900">
                                {previewRecruit.profileType}
                              </span>
                            )}
                            {previewRecruit.gender && (
                              <span className="rounded-full border border-slate-500/60 bg-slate-200/80 px-2 py-0.5 text-slate-900">
                                {previewRecruit.gender}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-[10px] text-slate-900">
                            Drag this recruit into an open slot in the roster to add them to
                            this season&apos;s team.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {activeTool === "budget" && (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Scholarship budget
            </p>

            {/* Budget summary (always visible) */}
            <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-[11px] text-slate-300">
              {scholarshipSummary.hasBudget ? (
                <>
                  <p className="text-[11px] font-semibold text-slate-200">
                    Equivalencies
                  </p>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-900">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{
                        width:
                          scholarshipSummary.budgetEquiv && scholarshipSummary.usedEquiv
                            ? `${Math.min(
                                100,
                                (scholarshipSummary.usedEquiv /
                                  scholarshipSummary.budgetEquiv) *
                                  100
                              )}%`
                            : "0%",
                      }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Budget:{" "}
                    <span className="font-semibold text-slate-100">
                      {scholarshipSummary.budgetEquiv ?? "—"}
                    </span>{" "}
                    eq • Used:{" "}
                    <span className="font-semibold text-slate-100">
                      {scholarshipSummary.usedEquiv ?? 0}
                    </span>{" "}
                    eq • Remaining:{" "}
                    <span className="font-semibold text-emerald-300">
                      {scholarshipSummary.remainingEquiv ?? 0}
                    </span>{" "}
                    eq
                  </p>

                  <p className="mt-2 text-[11px] font-semibold text-slate-200">
                    Scholarship amount
                  </p>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-900">
                    <div
                      className="h-full rounded-full bg-sky-500"
                      style={{
                        width:
                          scholarshipSummary.budgetAmount &&
                          scholarshipSummary.usedAmount
                            ? `${Math.min(
                                100,
                                (scholarshipSummary.usedAmount /
                                  scholarshipSummary.budgetAmount) *
                                  100
                              )}%`
                            : "0%",
                      }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Budget:{" "}
                    <span className="font-semibold text-slate-100">
                      {formatCurrency(scholarshipSummary.budgetAmount)}
                    </span>{" "}
                    • Used:{" "}
                    <span className="font-semibold text-slate-100">
                      {formatCurrency(scholarshipSummary.usedAmount)}
                    </span>{" "}
                    • Remaining:{" "}
                    <span className="font-semibold text-emerald-300">
                      {formatCurrency(scholarshipSummary.remainingAmount)}
                    </span>
                  </p>
                </>
              ) : (
                <p className="text-[11px] text-slate-400">
                  No scholarship budget set for this season yet.
                </p>
              )}
            </div>

            {/* Budget controls */}
            <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/70">
              <button
                type="button"
                onClick={() => setShowBudgetControls((prev) => !prev)}
                className="flex w-full items-center justify-between px-3 py-2 text-[11px] text-slate-300 hover:bg-slate-900/80"
              >
                <span className="font-semibold">Budget controls</span>
                <span className="text-[14px] text-slate-500">
                  {showBudgetControls ? "▾" : "▸"}
                </span>
              </button>
              {showBudgetControls && (
                <div className="border-t border-slate-800 px-3 py-2">
                  <SeasonBudgetControls
                    programId={programId}
                    teamId={teamId}
                    seasonId={seasonId}
                    currency={budgetCurrency}
                    initialEquiv={initialBudgetEquiv}
                    initialAmount={initialBudgetAmount}
                    initialIsLocked={initialSeasonLocked}
                  />
                </div>
              )}
            </div>

            {/* What-if calculator */}
            <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/70">
              <button
                type="button"
                onClick={() => setShowWhatIf((prev) => !prev)}
                className="flex w-full items-center justify-between px-3 py-2 text-[11px] text-slate-300 hover:bg-slate-900/80"
              >
                <span className="font-semibold">What-if calculator</span>
                <span className="text-[14px] text-slate-500">
                  {showWhatIf ? "▾" : "▸"}
                </span>
              </button>
              {showWhatIf && (
                <div className="border-t border-slate-800 px-3 py-2">
                  <ScholarshipWhatIf
                    budgetEquiv={scholarshipSummary.budgetEquiv ?? null}
                    usedEquiv={scholarshipSummary.usedEquiv ?? null}
                    budgetAmount={scholarshipSummary.budgetAmount ?? null}
                    usedAmount={scholarshipSummary.usedAmount ?? null}
                    currency={budgetCurrency}
                  />
                </div>
              )}
            </div>

            {/* Scholarship audit */}
            <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/70">
              <button
                type="button"
                onClick={() => setShowScholarshipAudit((prev) => !prev)}
                className="flex w-full items-center justify-between px-3 py-2 text-[11px] text-slate-300 hover:bg-slate-900/80"
              >
                <span className="font-semibold">Scholarship audit</span>
                <span className="text-[14px] text-slate-500">
                  {showScholarshipAudit ? "▾" : "▸"}
                </span>
              </button>
              {showScholarshipAudit && (
                <div className="border-t border-slate-800 px-3 py-2 max-h-64 overflow-y-auto">
                  <div className="mb-2 flex items-center justify-between text-[10px] text-slate-400">
                    <span>
                      Total equiv:{" "}
                      <span className="font-semibold text-slate-100">
                        {totalEquiv.toFixed(2)}
                      </span>
                    </span>
                    <span>
                      Total amount:{" "}
                      <span className="font-semibold text-slate-100">
                        {formatCurrency(totalDollar)}
                      </span>
                    </span>
                  </div>
                  <table className="w-full border-collapse text-[10px] text-slate-300">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="pb-1 text-left">
                          <button
                            type="button"
                            onClick={() => handleAuditSort("name")}
                            className="hover:text-slate-100"
                          >
                            Name
                          </button>
                        </th>
                        <th className="pb-1 text-right">
                          <button
                            type="button"
                            onClick={() => handleAuditSort("equiv")}
                            className="hover:text-slate-100"
                          >
                            Equiv
                          </button>
                        </th>
                        <th className="pb-1 text-right">
                          <button
                            type="button"
                            onClick={() => handleAuditSort("amount")}
                            className="hover:text-slate-100"
                          >
                            Amount
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditRows.map((row) => (
                        <tr key={row.id} className="border-b border-slate-900">
                          <td className="py-1 pr-2">
                            <div className="flex flex-col">
                              <span className="text-slate-100">{row.name}</span>
                              {row.gradYear && (
                                <span className="text-[9px] text-slate-500">
                                  {row.gradYear}
                                </span>
                              )}
                              {row.notes && (
                                <span className="mt-0.5 text-[9px] text-slate-500">
                                  {row.notes}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-1 text-right align-top">
                            {row.equiv != null ? row.equiv.toFixed(2) : "—"}
                          </td>
                          <td className="py-1 text-right align-top">
                            {row.dollar != null
                              ? formatCurrency(row.dollar)
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Budget history */}
            {budgetHistory.length > 0 && (
              <div className="mt-3 max-h-40 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-[11px] text-slate-300 overflow-y-auto">
                <p className="mb-1 text-[11px] font-semibold text-slate-200">
                  Budget changes
                </p>
                <ul className="space-y-1">
                  {budgetHistory.map((row) => (
                    <li
                      key={row.id}
                      className="border-t border-slate-800 pt-1 first:border-t-0"
                    >
                      <p className="text-[10px] text-slate-400">
                        {new Date(row.timestamp).toLocaleString()} •{" "}
                        <span className="font-semibold text-slate-200">
                          {row.coach}
                        </span>
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Equiv: {row.oldEquiv ?? "—"} →{" "}
                        <span className="font-semibold text-slate-100">
                          {row.newEquiv ?? "—"}
                        </span>{" "}
                        • Amount: {formatCurrency(row.oldAmount)} →{" "}
                        <span className="font-semibold text-slate-100">
                          {formatCurrency(row.newAmount)}
                        </span>
                      </p>
                      {row.notes && (
                        <p className="text-[10px] text-slate-500">{row.notes}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </aside>
       
      {editingScholarshipRosterId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70">
          <div className="w-full max-w-sm rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100">
            <p className="text-sm font-semibold">
              Adjust scholarship
              {editingScholarshipName && (
                <span className="mt-0.5 block text-[11px] font-normal text-slate-300">
                  {editingScholarshipName}
                </span>
              )}
            </p>

            <div className="mt-2 space-y-2 text-[11px]">
              <div>
                <label className="mb-1 block text-slate-400">
                  Amount
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-sky-500"
                  placeholder="Leave blank for no scholarship"
                  value={editingScholarshipAmount}
                  onChange={(e) => setEditingScholarshipAmount(e.target.value)}
                />
                <p className="mt-0.5 text-[10px] text-slate-500">
                  Interpreted based on unit: percent (e.g. 50), equivalency count (e.g. 0.5),
                  or dollar amount.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-slate-400">Unit</label>
                <select
                  value={editingScholarshipUnit}
                  onChange={(e) =>
                    setEditingScholarshipUnit(e.target.value as ScholarshipUnit)
                  }
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-sky-500"
                >
                  <option value="percent">Percent of full</option>
                  <option value="equivalency">Equivalency</option>
                  <option value="amount">Dollar amount</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-slate-400">Notes</label>
                <textarea
                  rows={3}
                  className="w-full resize-none rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-sky-500"
                  placeholder="Optional notes about this athlete's award (multi-year, conditions, etc.)"
                  value={editingScholarshipNotes}
                  onChange={(e) => setEditingScholarshipNotes(e.target.value)}
                />
              </div>

              {scholarshipError && (
                <p className="mt-1 text-[10px] text-rose-400">
                  {scholarshipError}
                </p>
              )}
            </div>

            <div className="mt-3 flex justify-end gap-2 text-[11px]">
              <button
                type="button"
                onClick={handleCancelScholarshipEdit}
                className="rounded-md border border-slate-600 px-3 py-1 text-slate-200 hover:bg-slate-800"
                disabled={savingScholarship}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveScholarshipEdit}
                disabled={savingScholarship || isLocked || !isManager}
                className="rounded-md bg-emerald-600 px-3 py-1 font-semibold text-slate-950 hover:bg-emerald-500 disabled:opacity-60"
              >
                {savingScholarship ? "Saving…" : "Save scholarship"}
              </button>
            </div>
          </div>
        </div>
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