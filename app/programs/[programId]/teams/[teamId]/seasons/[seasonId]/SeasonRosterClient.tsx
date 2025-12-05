"use client";

import { useEffect, useState } from "react";
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
};

type RecruitEntry = {
  programRecruitId: string;
  athleteId: string;
  fullName: string;
  gradYear: number | null;
  status: string | null;
  profileType: string | null;
};

type Props = {
  programId: string;
  teamId: string;
  seasonId: string;
  isManager: boolean;
  isLocked: boolean;
  roster: RosterEntry[];
};

export default function SeasonRosterClient({
  programId,
  teamId,
  seasonId,
  isManager,
  isLocked,
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

  // Keep local roster in sync if server sends a new one
  useEffect(() => {
    setRoster(initialRoster);
  }, [initialRoster]);

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
        }))
        // Require a valid program_recruit_id and filter out someone already on this roster
        .filter(
          (r) =>
            !!r.programRecruitId &&
            !alreadyOnRosterByRecruitId.has(r.programRecruitId)
        );

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

        {roster.length === 0 ? (
          <p className="text-[11px] text-slate-500">
            No athletes on this season&apos;s roster yet.
          </p>
        ) : (
          <div className="space-y-2">
            {roster.map((entry) => {
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
                  displayScholarship = entry.scholarshipAmount.toString();
                } else {
                  // amount
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
                            {entry.scholarshipUnit === "equivalency" &&
                              " (equiv)"}
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
                                <option value="percent">% percent</option>
                                <option value="equivalency">Eq equiv</option>
                                <option value="amount">$ amount</option>
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