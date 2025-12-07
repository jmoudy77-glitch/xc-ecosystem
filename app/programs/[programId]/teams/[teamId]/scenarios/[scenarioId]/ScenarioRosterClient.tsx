"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";

type ScenarioEntry = {
  id: string;
  athleteId: string | null;
  programRecruitId: string | null;
  name: string;
  gradYear: number | null;
  status: string | null;
  role: string | null;
  scholarshipAmount: number | null;
  scholarshipUnit: string | null;
  scholarshipNotes: string | null;
  createdAt: string | null;
};

type RosterCandidate = {
  athleteId: string;
  fullName: string;
  gradYear: number | null;
};

type RecruitCandidate = {
  programRecruitId: string;
  fullName: string;
  gradYear: number | null;
  status: string | null;
  profileType: string | null;
};

type Props = {
  programId: string;
  teamId: string;
  scenarioId: string;
  isManager: boolean;
  initialEntries: ScenarioEntry[];
};

export default function ScenarioRosterClient({
  programId,
  teamId,
  scenarioId,
  isManager,
  initialEntries,
}: Props) {
  const router = useRouter();

  const [entries, setEntries] = useState<ScenarioEntry[]>(initialEntries);

  // Scholarship editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>("");
  const [editUnit, setEditUnit] = useState<"percent" | "amount">("percent");
  const [editNotes, setEditNotes] = useState<string>("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  // Add-from-roster & recruits
  const [rosterCandidates, setRosterCandidates] = useState<RosterCandidate[]>([]);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [loadingRoster, setLoadingRoster] = useState(false);

  const [recruitCandidates, setRecruitCandidates] = useState<RecruitCandidate[]>([]);
  const [recruitsError, setRecruitsError] = useState<string | null>(null);
  const [loadingRecruits, setLoadingRecruits] = useState(false);

  // Keep in sync if server sends new entries
  useEffect(() => {
    setEntries(initialEntries);
  }, [initialEntries]);

  // --- Scholarship editing ---

  function startEditing(entry: ScenarioEntry) {
    setEditingId(entry.id);
    setEditAmount(
      entry.scholarshipAmount != null ? String(entry.scholarshipAmount) : ""
    );
    setEditUnit(
      (entry.scholarshipUnit as "percent" | "amount") || "percent"
    );
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

  async function save(entry: ScenarioEntry) {
    if (!editingId) return;

    const trimmed = editAmount.trim();
    let amountPayload: number | null = null;
    if (trimmed.length > 0) {
      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed)) {
        setEditError("Amount must be a valid number");
        return;
      }
      amountPayload = parsed;
    }

    setSavingId(entry.id);
    setEditError(null);

    try {
      const res = await fetch(
        `/api/programs/${programId}/teams/${teamId}/roster-scenarios/${scenarioId}/entries/${entry.id}`,
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

      const updated = body.entry as any;

      setEntries((prev) =>
        prev.map((e) =>
          e.id === entry.id
            ? {
                ...e,
                scholarshipAmount:
                  (updated.scholarship_amount as number | null) ?? null,
                scholarshipUnit:
                  (updated.scholarship_unit as string | null) ?? null,
                scholarshipNotes:
                  (updated.scholarship_notes as string | null) ?? null,
              }
            : e
        )
      );

      router.refresh();
      cancelEditing();
    } catch (e: any) {
      setEditError(e?.message || "Unexpected error");
      setSavingId(null);
    }
  }

  // --- Load roster candidates ---

  async function loadRosterCandidates() {
    if (!isManager) return;

    setLoadingRoster(true);
    setRosterError(null);

    try {
      const res = await fetch(
        `/api/programs/${programId}/teams/${teamId}/roster-candidates`
      );
      const body = await res.json();

      if (!res.ok) {
        setRosterError(body.error || "Failed to load roster candidates");
        setLoadingRoster(false);
        return;
      }

      const raw = (body.athletes ?? []) as any[];

      const inScenarioAthleteIds = new Set(
        entries
          .map((e) => e.athleteId)
          .filter((id): id is string => !!id)
      );

      const mapped: RosterCandidate[] = raw
        .map((a) => ({
          athleteId: a.athlete_id as string,
          fullName: (a.full_name as string) ?? "Athlete",
          gradYear: (a.grad_year as number | null) ?? null,
        }))
        .filter((c) => !!c.athleteId && !inScenarioAthleteIds.has(c.athleteId));

      setRosterCandidates(mapped);
    } catch (e: any) {
      setRosterError(e?.message || "Unexpected error");
    }

    setLoadingRoster(false);
  }

  // --- Load recruit candidates (program recruits) ---

  async function loadRecruitCandidates() {
    if (!isManager) return;

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

      const raw = (body.recruits ?? []) as any[];

      const inScenarioRecruitIds = new Set(
        entries
          .map((e) => e.programRecruitId)
          .filter((id): id is string => !!id)
      );

      const mapped: RecruitCandidate[] = raw
        .map((r) => ({
          programRecruitId: r.program_recruit_id as string,
          fullName: (r.full_name as string) ?? "Athlete",
          gradYear: (r.grad_year as number | null) ?? null,
          status: (r.status as string | null) ?? null,
          profileType: (r.profile_type as string | null) ?? null,
        }))
        .filter(
          (c) =>
            !!c.programRecruitId &&
            !inScenarioRecruitIds.has(c.programRecruitId)
        );

      setRecruitCandidates(mapped);
    } catch (e: any) {
      setRecruitsError(e?.message || "Unexpected error");
    }

    setLoadingRecruits(false);
  }

  useEffect(() => {
    loadRosterCandidates();
    loadRecruitCandidates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Add handlers ---

  async function handleAddFromRoster(c: RosterCandidate) {
    if (!isManager) return;

    try {
      const res = await fetch(
        `/api/programs/${programId}/teams/${teamId}/roster-scenarios/${scenarioId}/entries/add-from-roster`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ athlete_id: c.athleteId }),
        }
      );

      const body = await res.json();

      if (!res.ok) {
        alert(body.error || "Failed to add athlete to scenario");
        return;
      }

      setRosterCandidates((prev) =>
        prev.filter((x) => x.athleteId !== c.athleteId)
      );

      router.refresh();
    } catch (e: any) {
      alert(e?.message || "Unexpected error");
    }
  }

  async function handleAddFromRecruit(c: RecruitCandidate) {
    if (!isManager) return;

    try {
      const res = await fetch(
        `/api/programs/${programId}/teams/${teamId}/roster-scenarios/${scenarioId}/entries/add-from-recruit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ program_recruit_id: c.programRecruitId }),
        }
      );

      const body = await res.json();

      if (!res.ok) {
        alert(body.error || "Failed to add recruit to scenario");
        return;
      }

      setRecruitCandidates((prev) =>
        prev.filter((x) => x.programRecruitId !== c.programRecruitId)
      );

      router.refresh();
    } catch (e: any) {
      alert(e?.message || "Unexpected error");
    }
  }

  return (
    <div className="space-y-4">
      {/* Existing entries */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Scenario athletes
        </p>

        {entries.length === 0 ? (
          <p className="text-[11px] text-slate-500">
            No athletes in this scenario yet. Add athletes from your current
            roster or recruiting board below.
          </p>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => {
              const isEditing = editingId === entry.id;
              const displayScholarship =
                entry.scholarshipAmount != null
                  ? `${entry.scholarshipAmount}${
                      (entry.scholarshipUnit || "percent") === "percent"
                        ? "%"
                        : ""
                    }`
                  : "None";

              return (
                <div
                  key={entry.id}
                  className="flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <Avatar
                      src={undefined}
                      name={entry.name}
                      size="md"
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-100">
                        {entry.name}
                        {entry.gradYear && (
                          <span className="ml-2 text-[10px] text-slate-400">
                            • {entry.gradYear}
                          </span>
                        )}
                      </p>
                      <div className="mt-0.5 flex flex-wrap gap-2 text-[10px] text-slate-400">
                        {entry.status && (
                          <span className="rounded-full border border-slate-500/40 bg-slate-900/60 px-2 py-0.5">
                            {entry.status}
                          </span>
                        )}
                        {entry.role && (
                          <span className="rounded-full border border-emerald-400/40 bg-emerald-900/40 px-2 py-0.5 text-emerald-100">
                            {entry.role}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">
                        Scholarship (scenario):{" "}
                        <span className="font-medium text-slate-100">
                          {displayScholarship}
                        </span>
                        {entry.scholarshipUnit === "amount" && " (amount)"}
                        {entry.scholarshipUnit === "percent" && " (percent)"}
                      </p>
                      {entry.scholarshipNotes && (
                        <p className="mt-0.5 text-[10px] text-slate-500">
                          {entry.scholarshipNotes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="md:w-64">
                    {isManager ? (
                      isEditing ? (
                        <div className="space-y-1">
                          <div className="flex gap-2">
                            <input
                              value={editAmount}
                              onChange={(e) => setEditAmount(e.target.value)}
                              placeholder={
                                editUnit === "percent"
                                  ? "e.g., 75"
                                  : "e.g., 8500"
                              }
                              className="w-24 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500"
                            />
                            <select
                              value={editUnit}
                              onChange={(e) =>
                                setEditUnit(
                                  e.target.value as "percent" | "amount"
                                )
                              }
                              className="w-24 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500"
                            >
                              <option value="percent">% equiv</option>
                              <option value="amount">$ amount</option>
                            </select>
                          </div>
                          <textarea
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
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
                              onClick={() => save(entry)}
                              disabled={savingId === entry.id}
                              className="rounded-md bg-sky-600 px-2 py-1 text-[11px] font-semibold text-slate-950 hover:bg-sky-500 disabled:opacity-60"
                            >
                              {savingId === entry.id ? "Saving…" : "Save"}
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
                          Edit scholarship (scenario)
                        </button>
                      )
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

      {/* Add from current team roster */}
      <section className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Add from current team roster
        </p>
        <p className="mt-1 text-[11px] text-slate-500">
          Pull returning athletes from any season on this team into this scenario.
        </p>

        {rosterError && (
          <p className="mt-2 text-[11px] text-rose-400">{rosterError}</p>
        )}

        {loadingRoster ? (
          <p className="mt-2 text-[11px] text-slate-500">
            Loading roster candidates…
          </p>
        ) : rosterCandidates.length === 0 ? (
          <p className="mt-2 text-[11px] text-slate-500">
            No additional roster athletes available to add.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {rosterCandidates.map((c) => (
              <div
                key={c.athleteId}
                className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-slate-100">
                    {c.fullName}
                    {c.gradYear && (
                      <span className="ml-2 text-[10px] text-slate-400">
                        • {c.gradYear}
                      </span>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!isManager}
                  onClick={() => handleAddFromRoster(c)}
                  className="rounded-md border border-sky-500 bg-sky-600 px-3 py-1 text-[11px] font-semibold text-slate-950 hover:bg-sky-500 disabled:opacity-60"
                >
                  Add to scenario
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Add from recruits */}
      <section className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Add from recruits
        </p>
        <p className="mt-1 text-[11px] text-slate-500">
          Add committed / target recruits from your recruiting board into this
          scenario without touching your official roster.
        </p>

        {recruitsError && (
          <p className="mt-2 text-[11px] text-rose-400">{recruitsError}</p>
        )}

        {loadingRecruits ? (
          <p className="mt-2 text-[11px] text-slate-500">
            Loading recruits…
          </p>
        ) : recruitCandidates.length === 0 ? (
          <p className="mt-2 text-[11px] text-slate-500">
            No eligible recruits available to add.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {recruitCandidates.map((c) => (
              <div
                key={c.programRecruitId}
                className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-slate-100">
                    {c.fullName}
                    {c.gradYear && (
                      <span className="ml-2 text-[10px] text-slate-400">
                        • {c.gradYear}
                      </span>
                    )}
                  </p>
                  <div className="mt-0.5 flex flex-wrap gap-1 text-[10px] text-slate-400">
                    {c.status && (
                      <span className="rounded-full border border-emerald-400/40 bg-emerald-900/40 px-2 py-0.5 text-emerald-100">
                        {c.status}
                      </span>
                    )}
                    {c.profileType && (
                      <span className="rounded-full border border-slate-500/40 bg-slate-900/60 px-2 py-0.5">
                        {c.profileType}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!isManager}
                  onClick={() => handleAddFromRecruit(c)}
                  className="rounded-md border border-sky-500 bg-sky-600 px-3 py-1 text-[11px] font-semibold text-slate-950 hover:bg-sky-500 disabled:opacity-60"
                >
                  Add to scenario
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}