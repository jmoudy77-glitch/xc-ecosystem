"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
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
  eventGroup: string | null;
};

type RecruitCandidate = {
  programRecruitId: string;
  fullName: string;
  gradYear: number | null;
  status: string | null;
  profileType: string | null;
  eventGroup: string | null;
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

  function groupKey(label: string | null | undefined) {
    const v = (label || "").trim();
    return v.length ? v : "Unassigned";
  }

  function groupByEvent<T extends { eventGroup: string | null }>(items: T[]) {
    return items.reduce<Record<string, T[]>>((acc, item) => {
      const k = groupKey(item.eventGroup);
      acc[k] = acc[k] || [];
      acc[k].push(item);
      return acc;
    }, {});
  }

  const [openRosterGroups, setOpenRosterGroups] = useState<Record<string, boolean>>({});
  const [openRecruitGroups, setOpenRecruitGroups] = useState<Record<string, boolean>>({});

  // Primary sidebar groups (sources)
  const [openSources, setOpenSources] = useState<Record<"recruits" | "program", boolean>>({
    recruits: true,
    program: true,
  });

  // Sidebar slide-out card state
  const [selectedCandidate, setSelectedCandidate] = useState<
    | { kind: "recruit"; id: string; fullName: string; gradYear: number | null; eventGroup: string | null; meta?: { status?: string | null; profileType?: string | null } }
    | { kind: "athlete"; id: string; fullName: string; gradYear: number | null; eventGroup: string | null }
    | null
  >(null);

  function ensureOpenGroups(
    keys: string[],
    setter: Dispatch<SetStateAction<Record<string, boolean>>>
  ) {
    setter((prev) => {
      const next = { ...prev };
      for (const k of keys) {
        if (next[k] === undefined) next[k] = true;
      }
      return next;
    });
  }

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
          eventGroup: (a.event_group as string | null) ?? null,
        }))
        .filter((c) => !!c.athleteId && !inScenarioAthleteIds.has(c.athleteId));

      setRosterCandidates(mapped);
      const keys = Object.keys(groupByEvent(mapped));
      ensureOpenGroups(keys, setOpenRosterGroups);
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
          eventGroup: (r.event_group as string | null) ?? null,
        }))
        .filter(
          (c) =>
            !!c.programRecruitId &&
            !inScenarioRecruitIds.has(c.programRecruitId)
        );

      setRecruitCandidates(mapped);
      const keys = Object.keys(groupByEvent(mapped));
      ensureOpenGroups(keys, setOpenRecruitGroups);
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

      {/* Add athletes (intended for the right sidebar) */}
      <section className="relative overflow-hidden rounded-xl bg-[var(--surface)] p-4 ring-1 ring-[var(--border)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              Add to scenario
            </p>
            <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
              Pick from recruits or existing program athletes. Event groups are collapsible.
            </p>
          </div>
          <div className="text-[11px] font-semibold text-[var(--muted-foreground)]">
            {isManager ? "" : "Read-only"}
          </div>
        </div>

        {/* Primary group: Recruits */}
        <div className="mt-3 overflow-hidden rounded-xl bg-[var(--surface-subtle)] ring-1 ring-[var(--border)]">
          <button
            type="button"
            onClick={() =>
              setOpenSources((prev) => ({ ...prev, recruits: !prev.recruits }))
            }
            className="flex w-full items-center justify-between px-3 py-2 text-left"
          >
            <div className="min-w-0">
              <div className="truncate text-[12px] font-semibold text-[var(--foreground)]">
                Recruits
                <span className="ml-2 text-[10px] font-semibold text-[var(--muted-foreground)]">
                  • {recruitCandidates.length}
                </span>
              </div>
              <div className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">
                From your recruiting board
              </div>
            </div>
            <div className="text-[11px] font-semibold text-[var(--muted-foreground)]">
              {openSources.recruits ? "Hide" : "Show"}
            </div>
          </button>

          {openSources.recruits ? (
            <div className="border-t border-[var(--border)] p-2">
              {recruitsError ? (
                <p className="mb-2 text-[11px] text-rose-400">{recruitsError}</p>
              ) : null}

              {loadingRecruits ? (
                <p className="text-[11px] text-[var(--muted-foreground)]">Loading recruits…</p>
              ) : recruitCandidates.length === 0 ? (
                <p className="text-[11px] text-[var(--muted-foreground)]">No eligible recruits available to add.</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(groupByEvent(recruitCandidates))
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([group, items]) => {
                      const open = openRecruitGroups[group] !== false;
                      return (
                        <div
                          key={group}
                          className="overflow-hidden rounded-xl bg-[var(--surface)] ring-1 ring-[var(--border)]"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setOpenRecruitGroups((prev) => ({
                                ...prev,
                                [group]: !open,
                              }))
                            }
                            className="flex w-full items-center justify-between px-3 py-2 text-left"
                          >
                            <div className="min-w-0">
                              <div className="truncate text-[12px] font-semibold text-[var(--foreground)]">
                                {group}
                                <span className="ml-2 text-[10px] font-semibold text-[var(--muted-foreground)]">
                                  • {items.length}
                                </span>
                              </div>
                            </div>
                            <div className="text-[11px] font-semibold text-[var(--muted-foreground)]">
                              {open ? "Hide" : "Show"}
                            </div>
                          </button>

                          {open ? (
                            <div className="space-y-2 border-t border-[var(--border)] p-2">
                              {items.map((c) => (
                                <div
                                  key={c.programRecruitId}
                                  role="button"
                                  tabIndex={0}
                                  onClick={() =>
                                    setSelectedCandidate({
                                      kind: "recruit",
                                      id: c.programRecruitId,
                                      fullName: c.fullName,
                                      gradYear: c.gradYear,
                                      eventGroup: c.eventGroup,
                                      meta: { status: c.status, profileType: c.profileType },
                                    })
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      setSelectedCandidate({
                                        kind: "recruit",
                                        id: c.programRecruitId,
                                        fullName: c.fullName,
                                        gradYear: c.gradYear,
                                        eventGroup: c.eventGroup,
                                        meta: { status: c.status, profileType: c.profileType },
                                      });
                                    }
                                  }}
                                  className="flex items-center justify-between gap-3 rounded-lg bg-[var(--surface)] px-3 py-2 ring-1 ring-[var(--border)] hover:bg-[var(--muted-hover)]"
                                  title="Click for details"
                                >
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-[var(--foreground)]">
                                      {c.fullName}
                                      {c.gradYear && (
                                        <span className="ml-2 text-[10px] text-[var(--muted-foreground)]">• {c.gradYear}</span>
                                      )}
                                    </p>
                                    {(c.status || c.profileType) && (
                                      <div className="mt-0.5 flex flex-wrap gap-1 text-[10px] text-[var(--muted-foreground)]">
                                        {c.status ? (
                                          <span className="rounded-full bg-[var(--surface-subtle)] px-2 py-0.5 ring-1 ring-[var(--border)]">
                                            {c.status}
                                          </span>
                                        ) : null}
                                        {c.profileType ? (
                                          <span className="rounded-full bg-[var(--surface-subtle)] px-2 py-0.5 ring-1 ring-[var(--border)]">
                                            {c.profileType}
                                          </span>
                                        ) : null}
                                      </div>
                                    )}
                                  </div>

                                  <button
                                    type="button"
                                    disabled={!isManager}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddFromRecruit(c);
                                    }}
                                    className="rounded-md bg-[var(--muted)] px-2 py-1 text-[11px] font-semibold text-[var(--foreground)] ring-1 ring-[var(--border)] hover:bg-[var(--muted-hover)] disabled:opacity-60"
                                    title="Add to scenario"
                                  >
                                    + Add
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Primary group: Program athletes */}
        <div className="mt-3 overflow-hidden rounded-xl bg-[var(--surface-subtle)] ring-1 ring-[var(--border)]">
          <button
            type="button"
            onClick={() =>
              setOpenSources((prev) => ({ ...prev, program: !prev.program }))
            }
            className="flex w-full items-center justify-between px-3 py-2 text-left"
          >
            <div className="min-w-0">
              <div className="truncate text-[12px] font-semibold text-[var(--foreground)]">
                Program athletes
                <span className="ml-2 text-[10px] font-semibold text-[var(--muted-foreground)]">
                  • {rosterCandidates.length}
                </span>
              </div>
              <div className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">
                From any season on this team
              </div>
            </div>
            <div className="text-[11px] font-semibold text-[var(--muted-foreground)]">
              {openSources.program ? "Hide" : "Show"}
            </div>
          </button>

          {openSources.program ? (
            <div className="border-t border-[var(--border)] p-2">
              {rosterError ? (
                <p className="mb-2 text-[11px] text-rose-400">{rosterError}</p>
              ) : null}

              {loadingRoster ? (
                <p className="text-[11px] text-[var(--muted-foreground)]">Loading program athletes…</p>
              ) : rosterCandidates.length === 0 ? (
                <p className="text-[11px] text-[var(--muted-foreground)]">No additional program athletes available to add.</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(groupByEvent(rosterCandidates))
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([group, items]) => {
                      const open = openRosterGroups[group] !== false;
                      return (
                        <div
                          key={group}
                          className="overflow-hidden rounded-xl bg-[var(--surface)] ring-1 ring-[var(--border)]"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setOpenRosterGroups((prev) => ({
                                ...prev,
                                [group]: !open,
                              }))
                            }
                            className="flex w-full items-center justify-between px-3 py-2 text-left"
                          >
                            <div className="min-w-0">
                              <div className="truncate text-[12px] font-semibold text-[var(--foreground)]">
                                {group}
                                <span className="ml-2 text-[10px] font-semibold text-[var(--muted-foreground)]">
                                  • {items.length}
                                </span>
                              </div>
                            </div>
                            <div className="text-[11px] font-semibold text-[var(--muted-foreground)]">
                              {open ? "Hide" : "Show"}
                            </div>
                          </button>

                          {open ? (
                            <div className="space-y-2 border-t border-[var(--border)] p-2">
                              {items.map((c) => (
                                <div
                                  key={c.athleteId}
                                  role="button"
                                  tabIndex={0}
                                  onClick={() =>
                                    setSelectedCandidate({
                                      kind: "athlete",
                                      id: c.athleteId,
                                      fullName: c.fullName,
                                      gradYear: c.gradYear,
                                      eventGroup: c.eventGroup,
                                    })
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      setSelectedCandidate({
                                        kind: "athlete",
                                        id: c.athleteId,
                                        fullName: c.fullName,
                                        gradYear: c.gradYear,
                                        eventGroup: c.eventGroup,
                                      });
                                    }
                                  }}
                                  className="flex items-center justify-between gap-3 rounded-lg bg-[var(--surface)] px-3 py-2 ring-1 ring-[var(--border)] hover:bg-[var(--muted-hover)]"
                                  title="Click for details"
                                >
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-[var(--foreground)]">
                                      {c.fullName}
                                      {c.gradYear && (
                                        <span className="ml-2 text-[10px] text-[var(--muted-foreground)]">• {c.gradYear}</span>
                                      )}
                                    </p>
                                  </div>

                                  <button
                                    type="button"
                                    disabled={!isManager}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddFromRoster(c);
                                    }}
                                    className="rounded-md bg-[var(--muted)] px-2 py-1 text-[11px] font-semibold text-[var(--foreground)] ring-1 ring-[var(--border)] hover:bg-[var(--muted-hover)] disabled:opacity-60"
                                    title="Add to scenario"
                                  >
                                    + Add
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Slide-out detail card (within sidebar) */}
        {selectedCandidate ? (
          <div className="absolute inset-0 z-10 bg-[var(--surface)] p-4 ring-1 ring-[var(--border)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                  {selectedCandidate.kind === "recruit" ? "Recruit" : "Program athlete"} details
                </p>
                <p className="mt-1 truncate text-base font-semibold text-[var(--foreground)]">
                  {selectedCandidate.fullName}
                </p>
                <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                  {selectedCandidate.gradYear ? `Grad year: ${selectedCandidate.gradYear}` : "Grad year: —"}
                  {" · "}
                  {selectedCandidate.eventGroup ? `Event group: ${groupKey(selectedCandidate.eventGroup)}` : "Event group: Unassigned"}
                </p>
                {selectedCandidate.kind === "recruit" && selectedCandidate.meta ? (
                  <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                    {selectedCandidate.meta.status ? `Status: ${selectedCandidate.meta.status}` : ""}
                    {selectedCandidate.meta.status && selectedCandidate.meta.profileType ? " · " : ""}
                    {selectedCandidate.meta.profileType ? `Profile: ${selectedCandidate.meta.profileType}` : ""}
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                className="rounded-md bg-[var(--muted)] px-2 py-1 text-[11px] font-semibold text-[var(--foreground)] ring-1 ring-[var(--border)] hover:bg-[var(--muted-hover)]"
              >
                Close
              </button>
            </div>

            <div className="mt-4 rounded-xl bg-[var(--surface-subtle)] p-3 ring-1 ring-[var(--border)]">
              <p className="text-[11px] font-semibold text-[var(--foreground)]">Quick actions</p>
              <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                Add this {selectedCandidate.kind === "recruit" ? "recruit" : "athlete"} to the scenario.
              </p>

              <div className="mt-3">
                {selectedCandidate.kind === "recruit" ? (
                  <button
                    type="button"
                    disabled={!isManager}
                    onClick={async () => {
                      const found = recruitCandidates.find((r) => r.programRecruitId === selectedCandidate.id);
                      if (found) await handleAddFromRecruit(found);
                      setSelectedCandidate(null);
                    }}
                    className="w-full rounded-md bg-[color:var(--brand)] px-3 py-2 text-[12px] font-semibold text-white hover:opacity-90 disabled:opacity-60"
                  >
                    + Add recruit to scenario
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!isManager}
                    onClick={async () => {
                      const found = rosterCandidates.find((a) => a.athleteId === selectedCandidate.id);
                      if (found) await handleAddFromRoster(found);
                      setSelectedCandidate(null);
                    }}
                    className="w-full rounded-md bg-[color:var(--brand)] px-3 py-2 text-[12px] font-semibold text-white hover:opacity-90 disabled:opacity-60"
                  >
                    + Add athlete to scenario
                  </button>
                )}
              </div>
            </div>

            <div className="mt-4 text-[10px] text-[var(--muted-foreground)]">
              Coach note: this panel is intentionally lightweight for now; the full athlete slide-out will reuse the Athlete profile UI.
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}