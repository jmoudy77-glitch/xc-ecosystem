"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ScenarioEntry = {
  id: string;
  athleteId: string | null;
  programRecruitId: string | null;
  athleteName: string;
  gradYear: number | null;
  scholarshipAmount: number | null;
  scholarshipUnit: "percent" | "amount" | string;
  scholarshipNotes: string | null;
  createdAt: string | null;
};

type AthleteSearchResult = {
  id: string;
  first_name: string;
  last_name: string;
  grad_year: number | null;
  event_group: string | null;
  relationship_type?: string | null;
  status?: string | null;
};

type RecruitSearchResult = {
  id: string; // program_recruits.id
  first_name: string;
  last_name: string;
  grad_year: number | null;
  event_group: string | null;
  status?: string | null;
};

type Props = {
  programId: string;
  teamId: string;
  scenarioId: string;
  initialEntries: ScenarioEntry[];
  unitLabel: string; // for display only
};

type ScenarioStatus = "draft" | "candidate" | "active";

function normalizeScenarioStatus(v: any): ScenarioStatus {
  return v === "active" || v === "candidate" || v === "draft" ? v : "draft";
}

function StatusBadge({ status }: { status: ScenarioStatus }) {
  const label = status === "active" ? "Active" : status === "candidate" ? "Candidate" : "Draft";
  const icon = status === "active" ? "👑" : status === "candidate" ? "⭐" : "";
  const tone =
    status === "active"
      ? "bg-[var(--success-subtle)] text-[var(--success)] ring-[var(--success)]"
      : status === "candidate"
      ? "bg-[var(--muted)] text-[var(--foreground)] ring-[var(--border)]"
      : "bg-[var(--surface)] text-[var(--muted-foreground)] ring-[var(--border)]";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ring-1 ${tone}`}
      title={
        status === "active"
          ? "Official roster (locked)"
          : status === "candidate"
          ? "Next in line for promotion"
          : "Safe draft"
      }
    >
      {icon ? <span aria-hidden>{icon}</span> : null}
      <span>{label}</span>
    </span>
  );
}

export default function ScenarioEntriesClient({
  programId,
  teamId,
  scenarioId,
  initialEntries,
  unitLabel,
}: Props) {
  const [entries, setEntries] = useState<ScenarioEntry[]>(initialEntries);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [scenarioStatus, setScenarioStatus] = useState<ScenarioStatus>("draft");
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusActionLoading, setStatusActionLoading] = useState<ScenarioStatus | "return" | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const scenariosEndpoint = useMemo(
    () => `/api/programs/${programId}/teams/${teamId}/roster-scenarios`,
    [programId, teamId]
  );

  const statusEndpoint = useMemo(
    () =>
      `/api/programs/${programId}/teams/${teamId}/roster-scenarios/${scenarioId}/status`,
    [programId, teamId, scenarioId]
  );
  useEffect(() => {
    let canceled = false;

    async function run() {
      setStatusError(null);
      setStatusLoading(true);
      try {
        const res = await fetch(scenariosEndpoint, { method: "GET" });
        const body = await res.json();
        if (canceled) return;

        if (!res.ok) {
          setStatusError(body?.error || "Failed to load scenario status");
          setStatusLoading(false);
          return;
        }

        const list = (body?.scenarios || []) as any[];
        const sc = list.find((s) => s?.id === scenarioId);
        setScenarioStatus(normalizeScenarioStatus(sc?.status));
      } catch (e: any) {
        if (canceled) return;
        setStatusError(e?.message || "Failed to load scenario status");
      }

      if (!canceled) setStatusLoading(false);
    }

    run();
    return () => {
      canceled = true;
    };
  }, [scenariosEndpoint, scenarioId]);
  async function setScenarioStatusRemote(next: ScenarioStatus | "return") {
    setStatusError(null);
    setStatusActionLoading(next);

    try {
      const payload =
        next === "return" ? { returnToPlanning: true } : { status: next };

      const res = await fetch(statusEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await res.json();

      if (!res.ok) {
        setStatusError(body?.error || "Failed to update scenario status");
        setStatusActionLoading(null);
        return;
      }

      const updated = body?.scenario;
      setScenarioStatus(normalizeScenarioStatus(updated?.status));

      // Refresh server components / summary cards.
      router.refresh();
    } catch (e: any) {
      setStatusError(e?.message || "Failed to update scenario status");
    }

    setStatusActionLoading(null);
  }

  const [addOpen, setAddOpen] = useState(false);
  const [addTab, setAddTab] = useState<"athlete" | "recruit">("athlete");
  // const [addAthleteId, setAddAthleteId] = useState("");
  // const [addRecruitId, setAddRecruitId] = useState("");
  const [addEventGroup, setAddEventGroup] = useState("");
  const [addNotes, setAddNotes] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [athleteQuery, setAthleteQuery] = useState("");
  const [athleteSearching, setAthleteSearching] = useState(false);
  const [athleteResults, setAthleteResults] = useState<AthleteSearchResult[]>([]);

  const athleteSearchEndpoint = useMemo(() => {
    const q = athleteQuery.trim();
    if (!q) return null;
    return `/api/programs/${programId}/athletes?q=${encodeURIComponent(q)}`;
  }, [athleteQuery, programId]);

  const existingAthleteIds = useMemo(() => {
    return new Set(entries.map((e) => e.athleteId).filter(Boolean) as string[]);
  }, [entries]);

  const [recruitQuery, setRecruitQuery] = useState("");
  const [recruitSearching, setRecruitSearching] = useState(false);
  const [recruitResults, setRecruitResults] = useState<RecruitSearchResult[]>([]);

  const recruitSearchEndpoint = useMemo(() => {
    const q = recruitQuery.trim();
    if (!q) return null;
    return `/api/programs/${programId}/recruits?q=${encodeURIComponent(q)}`;
  }, [recruitQuery, programId]);

  const existingRecruitIds = useMemo(() => {
    return new Set(
      entries.map((e) => e.programRecruitId).filter(Boolean) as string[]
    );
  }, [entries]);

  const entriesEndpoint = useMemo(
    () =>
      `/api/programs/${programId}/teams/${teamId}/roster-scenarios/${scenarioId}/entries`,
    [programId, teamId, scenarioId]
  );

  useEffect(() => {
    let canceled = false;

    async function run() {
      if (addTab !== "athlete") return;
      if (!athleteSearchEndpoint) {
        setAthleteResults([]);
        setAthleteSearching(false);
        return;
      }

      setAthleteSearching(true);
      try {
        const res = await fetch(athleteSearchEndpoint, { method: "GET" });
        const body = await res.json();
        if (canceled) return;

        if (!res.ok) {
          console.error("[ScenarioEntries] athlete search failed:", body?.error);
          setAthleteResults([]);
          setAthleteSearching(false);
          return;
        }

        const list = (body?.athletes || []) as AthleteSearchResult[];
        // Filter out athletes already in the scenario
        setAthleteResults(list.filter((a) => !existingAthleteIds.has(a.id)));
      } catch (e) {
        if (canceled) return;
        console.error("[ScenarioEntries] athlete search exception:", e);
        setAthleteResults([]);
      }

      if (!canceled) setAthleteSearching(false);
    }

    const t = setTimeout(run, 200);
    return () => {
      canceled = true;
      clearTimeout(t);
    };
  }, [addTab, athleteSearchEndpoint, existingAthleteIds]);

  useEffect(() => {
    let canceled = false;

    async function run() {
      if (addTab !== "recruit") return;
      if (!recruitSearchEndpoint) {
        setRecruitResults([]);
        setRecruitSearching(false);
        return;
      }

      setRecruitSearching(true);
      try {
        const res = await fetch(recruitSearchEndpoint, { method: "GET" });
        const body = await res.json();
        if (canceled) return;

        if (!res.ok) {
          console.error("[ScenarioEntries] recruit search failed:", body?.error);
          setRecruitResults([]);
          setRecruitSearching(false);
          return;
        }

        const rows = (body?.recruits || []) as any[];

        const list: RecruitSearchResult[] = rows
          .map((r) => {
            const a = r?.recruiting_profile?.athlete;
            if (!r?.id || !a) return null;
            return {
              id: r.id,
              first_name: a.first_name,
              last_name: a.last_name,
              grad_year: a.grad_year ?? null,
              event_group: a.event_group ?? null,
              status: r.status ?? null,
            } as RecruitSearchResult;
          })
          .filter(Boolean) as RecruitSearchResult[];

        setRecruitResults(list.filter((r) => !existingRecruitIds.has(r.id)));
      } catch (e) {
        if (canceled) return;
        console.error("[ScenarioEntries] recruit search exception:", e);
        setRecruitResults([]);
      }

      if (!canceled) setRecruitSearching(false);
    }

    const t = setTimeout(run, 200);
    return () => {
      canceled = true;
      clearTimeout(t);
    };
  }, [addTab, recruitSearchEndpoint, existingRecruitIds]);

  async function refreshEntries() {
    try {
      const res = await fetch(entriesEndpoint, { method: "GET" });
      const body = await res.json();
      if (!res.ok) {
        // Don’t clobber the main error banner; this is best-effort.
        console.error("[ScenarioEntries] refresh failed:", body?.error);
        return;
      }

      // Expect the API to return { entries: [...] }
      const next = (body?.entries || []) as any[];
      setEntries(
        next.map((e) => ({
          id: e.id,
          athleteId: e.athlete_id ?? null,
          programRecruitId: e.program_recruit_id ?? null,
          athleteName: e.athlete_name || e.athleteName || "—",
          gradYear: e.grad_year ?? e.gradYear ?? null,
          scholarshipAmount: e.scholarship_amount ?? e.scholarshipAmount ?? null,
          scholarshipUnit: e.scholarship_unit ?? e.scholarshipUnit ?? "percent",
          scholarshipNotes: e.scholarship_notes ?? e.scholarshipNotes ?? null,
          createdAt: e.created_at ?? e.createdAt ?? null,
        }))
      );
    } catch (e) {
      console.error("[ScenarioEntries] refresh exception:", e);
    }
  }

  async function handleAddEntry(override?: { athlete_id?: string | null; program_recruit_id?: string | null }) {
    setAddError(null);

    // Remove dead state logic for addAthleteId/addRecruitId
    const athlete_id = (override?.athlete_id ?? "") || "";
    const program_recruit_id = (override?.program_recruit_id ?? "") || "";

    if (!athlete_id && !program_recruit_id) {
      setAddError(
        addTab === "athlete"
          ? "Athlete ID is required"
          : "Recruit ID is required"
      );
      return;
    }

    setAdding(true);

    try {
      const res = await fetch(entriesEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athlete_id: athlete_id || null,
          program_recruit_id: program_recruit_id || null,
          event_group: addEventGroup.trim() || null,
          notes: addNotes.trim() || null,
          // Keep unit consistent with the current scenario view; editable later.
          scholarship_unit: "percent",
        }),
      });

      const body = await res.json();

      if (!res.ok) {
        setAddError(body?.error || "Failed to add entry");
        setAdding(false);
        return;
      }

      // Best-effort: refresh list from server for canonical join fields.
      await refreshEntries();

      // Update summary card
      router.refresh();

      // Close + reset
      setAddOpen(false);
      setAddEventGroup("");
      setAddNotes("");
      setAddError(null);
      setAthleteQuery("");
      setAthleteResults([]);
      setAthleteSearching(false);
      setRecruitQuery("");
      setRecruitResults([]);
      setRecruitSearching(false);
    } catch (e: any) {
      setAddError(e?.message || "Unexpected error adding entry");
    }

    setAdding(false);
  }

  async function handleSave(entryId: string) {
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) return;

    setSavingId(entryId);
    setError(null);

    try {
      const res = await fetch(
        `/api/programs/${programId}/teams/${teamId}/roster-scenarios/${scenarioId}/entries/${entryId}/scholarship`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scholarship_amount: entry.scholarshipAmount,
            scholarship_notes: entry.scholarshipNotes,
            // For now we keep unit fixed; wire this up later if needed:
            scholarship_unit: entry.scholarshipUnit,
          }),
        }
      );

      const body = await res.json();

      if (!res.ok) {
        setError(body.error || "Failed to save scholarship values");
        setSavingId(null);
        return;
      }

      const updated = body.entry as {
        id: string;
        scholarship_amount: number | null;
        scholarship_unit: string;
        scholarship_notes: string | null;
      };

      setEntries((prev) =>
        prev.map((e) =>
          e.id === updated.id
            ? {
                ...e,
                scholarshipAmount: updated.scholarship_amount,
                scholarshipUnit: updated.scholarship_unit,
                scholarshipNotes: updated.scholarship_notes,
              }
            : e
        )
      );

      // Refresh to update summary card
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Unexpected error saving scholarship");
    }

    setSavingId(null);
  }

  if (entries.length === 0) {
    return (
      <section className="mt-2 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-subtle)] p-5">
        <div className="mb-4 rounded-xl bg-[var(--surface)] p-4 ring-1 ring-[var(--border)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-semibold text-[var(--foreground)]">Scenario status</p>
                <StatusBadge status={scenarioStatus} />
                {statusLoading ? (
                  <span className="text-[10px] text-[var(--muted-foreground)]">Loading…</span>
                ) : null}
              </div>
              <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                {scenarioStatus === "draft"
                  ? "Safe draft — add athletes and explore options."
                  : scenarioStatus === "candidate"
                  ? "Review details, then promote when ready."
                  : "Active roster (locked) — return to planning to make edits."}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {scenarioStatus === "draft" ? (
                <button
                  type="button"
                  onClick={() => setScenarioStatusRemote("candidate")}
                  disabled={!!statusActionLoading}
                  className="rounded-md bg-[var(--muted)] px-3 py-2 text-[12px] font-semibold text-[var(--foreground)] ring-1 ring-[var(--border)] hover:bg-[var(--muted-hover)] disabled:opacity-60"
                  title="Mark this scenario as the primary candidate for promotion"
                >
                  {statusActionLoading === "candidate" ? "Working…" : "Mark as Candidate"}
                </button>
              ) : null}

              {scenarioStatus === "candidate" ? (
                <>
                  <button
                    type="button"
                    onClick={() => setScenarioStatusRemote("active")}
                    disabled={!!statusActionLoading}
                    className="rounded-md bg-[var(--muted)] px-3 py-2 text-[12px] font-semibold text-[var(--foreground)] ring-1 ring-[var(--border)] hover:bg-[var(--muted-hover)] disabled:opacity-60"
                    title="Promote this scenario to the Active Roster"
                  >
                    {statusActionLoading === "active" ? "Working…" : "Promote to Active"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setScenarioStatusRemote("draft")}
                    disabled={!!statusActionLoading}
                    className="rounded-md bg-[var(--surface-subtle)] px-3 py-2 text-[12px] font-semibold text-[var(--muted-foreground)] ring-1 ring-[var(--border)] hover:bg-[var(--muted-hover)] disabled:opacity-60"
                    title="Return this scenario to Draft"
                  >
                    {statusActionLoading === "draft" ? "Working…" : "Back to Draft"}
                  </button>
                </>
              ) : null}

              {scenarioStatus === "active" ? (
                <button
                  type="button"
                  onClick={() => setScenarioStatusRemote("return")}
                  disabled={!!statusActionLoading}
                  className="rounded-md bg-[var(--muted)] px-3 py-2 text-[12px] font-semibold text-[var(--foreground)] ring-1 ring-[var(--border)] hover:bg-[var(--muted-hover)] disabled:opacity-60"
                  title="Return the Active Roster to planning (demotable unless season is locked)"
                >
                  {statusActionLoading === "return" ? "Working…" : "Return to Planning"}
                </button>
              ) : null}
            </div>
          </div>

          {statusError ? (
            <div className="mt-2 text-[11px] text-[var(--danger)]">{statusError}</div>
          ) : null}
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
          Scenario entries
        </p>
        <p className="mt-2 text-[11px] text-[var(--muted-foreground)]">
          No athletes have been added to this scenario yet. Once you add
          athletes or recruits, you&rsquo;ll be able to assign scholarship
          amounts here.
        </p>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => {
              setAddError(null);
              setAddOpen(true);
            }}
            className="rounded-md bg-[var(--muted)] px-3 py-2 text-[12px] font-semibold text-[var(--foreground)] ring-1 ring-[var(--border)] hover:bg-[var(--muted-hover)]"
          >
            Add athlete or recruit
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-2 rounded-xl bg-[var(--surface)] p-5 ring-1 ring-[var(--border)]">
      <div className="mb-4 rounded-xl bg-[var(--surface)] p-4 ring-1 ring-[var(--border)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-semibold text-[var(--foreground)]">Scenario status</p>
              <StatusBadge status={scenarioStatus} />
              {statusLoading ? (
                <span className="text-[10px] text-[var(--muted-foreground)]">Loading…</span>
              ) : null}
            </div>
            <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
              {scenarioStatus === "draft"
                ? "Safe draft — add athletes and explore options."
                : scenarioStatus === "candidate"
                ? "Review details, then promote when ready."
                : "Active roster (locked) — return to planning to make edits."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {scenarioStatus === "draft" ? (
              <button
                type="button"
                onClick={() => setScenarioStatusRemote("candidate")}
                disabled={!!statusActionLoading}
                className="rounded-md bg-[var(--muted)] px-3 py-2 text-[12px] font-semibold text-[var(--foreground)] ring-1 ring-[var(--border)] hover:bg-[var(--muted-hover)] disabled:opacity-60"
                title="Mark this scenario as the primary candidate for promotion"
              >
                {statusActionLoading === "candidate" ? "Working…" : "Mark as Candidate"}
              </button>
            ) : null}

            {scenarioStatus === "candidate" ? (
              <>
                <button
                  type="button"
                  onClick={() => setScenarioStatusRemote("active")}
                  disabled={!!statusActionLoading}
                  className="rounded-md bg-[var(--muted)] px-3 py-2 text-[12px] font-semibold text-[var(--foreground)] ring-1 ring-[var(--border)] hover:bg-[var(--muted-hover)] disabled:opacity-60"
                  title="Promote this scenario to the Active Roster"
                >
                  {statusActionLoading === "active" ? "Working…" : "Promote to Active"}
                </button>
                <button
                  type="button"
                  onClick={() => setScenarioStatusRemote("draft")}
                  disabled={!!statusActionLoading}
                  className="rounded-md bg-[var(--surface-subtle)] px-3 py-2 text-[12px] font-semibold text-[var(--muted-foreground)] ring-1 ring-[var(--border)] hover:bg-[var(--muted-hover)] disabled:opacity-60"
                  title="Return this scenario to Draft"
                >
                  {statusActionLoading === "draft" ? "Working…" : "Back to Draft"}
                </button>
              </>
            ) : null}

            {scenarioStatus === "active" ? (
              <button
                type="button"
                onClick={() => setScenarioStatusRemote("return")}
                disabled={!!statusActionLoading}
                className="rounded-md bg-[var(--muted)] px-3 py-2 text-[12px] font-semibold text-[var(--foreground)] ring-1 ring-[var(--border)] hover:bg-[var(--muted-hover)] disabled:opacity-60"
                title="Return the Active Roster to planning (demotable unless season is locked)"
              >
                {statusActionLoading === "return" ? "Working…" : "Return to Planning"}
              </button>
            ) : null}
          </div>
        </div>

        {statusError ? (
          <div className="mt-2 text-[11px] text-[var(--danger)]">{statusError}</div>
        ) : null}
      </div>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            Scenario entries
          </p>
          <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
            Edit scholarship amounts and notes for each athlete in this
            scenario. Changes here only affect this sandbox.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setAddError(null);
            setAddOpen(true);
          }}
          className="rounded-md bg-[var(--muted)] px-3 py-2 text-[12px] font-semibold text-[var(--foreground)] ring-1 ring-[var(--border)] hover:bg-[var(--muted-hover)]"
        >
          Add
        </button>
      </div>

      {error && (
        <p className="mt-2 text-[11px] text-[var(--danger)]">
          {error}
        </p>
      )}

      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-[var(--border)] text-[10px] text-[var(--muted-foreground)]">
              <th className="px-2 py-1 text-left font-normal">Athlete</th>
              <th className="px-2 py-1 text-left font-normal">Class</th>
              <th className="px-2 py-1 text-left font-normal">
                Scholarship ({unitLabel})
              </th>
              <th className="px-2 py-1 text-left font-normal">Notes</th>
              <th className="px-2 py-1 text-right font-normal">Save</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                key={entry.id}
                className="border-b border-[var(--border)]/50 last:border-0"
              >
                <td className="px-2 py-1 text-[var(--foreground)]">
                  {entry.athleteName}
                </td>
                <td className="px-2 py-1 text-[var(--muted-foreground)]">
                  {entry.gradYear ?? "—"}
                </td>
                <td className="px-2 py-1">
                  <input
                    type="number"
                    step="0.01"
                    className="w-24 rounded-md bg-[var(--surface)] px-2 py-1 text-xs text-[var(--foreground)] ring-1 ring-[var(--border)] outline-none focus:ring-2 focus:ring-[var(--border)]"
                    value={
                      entry.scholarshipAmount ?? ""
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      setEntries((prev) =>
                        prev.map((p) =>
                          p.id === entry.id
                            ? {
                                ...p,
                                scholarshipAmount:
                                  value === "" ? null : Number(value),
                              }
                            : p
                        )
                      );
                    }}
                  />
                </td>
                <td className="px-2 py-1">
                  <textarea
                    rows={2}
                    className="w-full min-w-[180px] rounded-md bg-[var(--surface)] px-2 py-1 text-xs text-[var(--foreground)] ring-1 ring-[var(--border)] outline-none focus:ring-2 focus:ring-[var(--border)]"
                    value={entry.scholarshipNotes ?? ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      setEntries((prev) =>
                        prev.map((p) =>
                          p.id === entry.id
                            ? {
                                ...p,
                                scholarshipNotes:
                                  value === "" ? null : value,
                              }
                            : p
                        )
                      );
                    }}
                  />
                </td>
                <td className="px-2 py-1 text-right">
                  <button
                    type="button"
                    onClick={() => handleSave(entry.id)}
                    disabled={savingId === entry.id}
                    className="rounded-md bg-[var(--muted)] px-3 py-1 text-[11px] font-semibold text-[var(--foreground)] ring-1 ring-[var(--border)] hover:bg-[var(--muted-hover)] disabled:opacity-60"
                  >
                    {savingId === entry.id ? "Saving…" : "Save"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {addOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] p-4">
          <div className="w-full max-w-xl rounded-2xl bg-[var(--surface)] p-5 ring-1 ring-[var(--border)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[var(--foreground)]">
                  Add to scenario
                </div>
                <div className="mt-1 text-[12px] text-[var(--muted-foreground)]">
                  Search and add athletes or recruits. Click a result to add it to this scenario.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="rounded-md bg-[var(--muted)] px-2 py-1 text-[12px] font-semibold text-[var(--foreground)] ring-1 ring-[var(--border)] hover:bg-[var(--muted-hover)]"
              >
                Close
              </button>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setAddTab("athlete")}
                className={`flex-1 rounded-md px-3 py-2 text-[12px] font-semibold ring-1 ring-[var(--border)] ${
                  addTab === "athlete"
                    ? "bg-[var(--muted)] text-[var(--foreground)]"
                    : "bg-[var(--surface-subtle)] text-[var(--muted-foreground)] hover:bg-[var(--muted-hover)]"
                }`}
              >
                Athlete
              </button>
              <button
                type="button"
                onClick={() => setAddTab("recruit")}
                className={`flex-1 rounded-md px-3 py-2 text-[12px] font-semibold ring-1 ring-[var(--border)] ${
                  addTab === "recruit"
                    ? "bg-[var(--muted)] text-[var(--foreground)]"
                    : "bg-[var(--surface-subtle)] text-[var(--muted-foreground)] hover:bg-[var(--muted-hover)]"
                }`}
              >
                Recruit
              </button>
            </div>

            {addError ? (
              <div className="mt-3 text-[11px] text-[var(--danger)]">
                {addError}
              </div>
            ) : null}

            <div className="mt-4 space-y-3">
              {addTab === "athlete" ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-[var(--muted-foreground)]">
                      Search athletes
                    </label>
                    <input
                      value={athleteQuery}
                      onChange={(e) => setAthleteQuery(e.target.value)}
                      placeholder="Search by first or last name…"
                      className="w-full rounded-md bg-[var(--surface)] px-2 py-2 text-xs text-[var(--foreground)] ring-1 ring-[var(--border)] outline-none focus:ring-2 focus:ring-[var(--border)]"
                    />
                    <div className="text-[10px] text-[var(--muted-foreground)]">
                      Showing athletes in this program (excluding those already in the scenario).
                    </div>
                  </div>

                  <div className="max-h-64 overflow-auto rounded-xl bg-[var(--surface-subtle)] p-2 ring-1 ring-[var(--border)]">
                    {!athleteQuery.trim() ? (
                      <div className="p-2 text-[11px] text-[var(--muted-foreground)]">
                        Type a name to search.
                      </div>
                    ) : athleteSearching ? (
                      <div className="p-2 text-[11px] text-[var(--muted-foreground)]">
                        Searching…
                      </div>
                    ) : athleteResults.length === 0 ? (
                      <div className="p-2 text-[11px] text-[var(--muted-foreground)]">
                        No matches.
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {athleteResults.map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={async () => {
                              setAddError(null);
                              await handleAddEntry({ athlete_id: a.id, program_recruit_id: null });
                            }}
                            disabled={adding}
                            className="flex w-full items-center justify-between rounded-lg bg-[var(--surface)] px-3 py-2 text-left ring-1 ring-[var(--border)] hover:bg-[var(--muted-hover)] disabled:opacity-60"
                          >
                            <div className="min-w-0">
                              <div className="truncate text-[12px] font-semibold text-[var(--foreground)]">
                                {a.first_name} {a.last_name}
                              </div>
                              <div className="truncate text-[10px] text-[var(--muted-foreground)]">
                                {a.grad_year ?? "—"} • {a.event_group || "—"}
                              </div>
                            </div>
                            <div className="ml-3 shrink-0 text-[10px] font-semibold text-[var(--muted-foreground)]">
                              Add
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl bg-[var(--surface-subtle)] p-3 text-[11px] text-[var(--muted-foreground)] ring-1 ring-[var(--border)]">
                    Can’t find an athlete? Use the roster/recruiting tools to add them to the program first.
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-[var(--muted-foreground)]">
                      Search recruits
                    </label>
                    <input
                      value={recruitQuery}
                      onChange={(e) => setRecruitQuery(e.target.value)}
                      placeholder="Search by first or last name…"
                      className="w-full rounded-md bg-[var(--surface)] px-2 py-2 text-xs text-[var(--foreground)] ring-1 ring-[var(--border)] outline-none focus:ring-2 focus:ring-[var(--border)]"
                    />
                    <div className="text-[10px] text-[var(--muted-foreground)]">
                      Showing recruits in this program (excluding those already in the scenario).
                    </div>
                  </div>

                  <div className="max-h-64 overflow-auto rounded-xl bg-[var(--surface-subtle)] p-2 ring-1 ring-[var(--border)]">
                    {!recruitQuery.trim() ? (
                      <div className="p-2 text-[11px] text-[var(--muted-foreground)]">
                        Type a name to search.
                      </div>
                    ) : recruitSearching ? (
                      <div className="p-2 text-[11px] text-[var(--muted-foreground)]">
                        Searching…
                      </div>
                    ) : recruitResults.length === 0 ? (
                      <div className="p-2 text-[11px] text-[var(--muted-foreground)]">
                        No matches.
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {recruitResults.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={async () => {
                              setAddError(null);
                              await handleAddEntry({ athlete_id: null, program_recruit_id: r.id });
                            }}
                            disabled={adding}
                            className="flex w-full items-center justify-between rounded-lg bg-[var(--surface)] px-3 py-2 text-left ring-1 ring-[var(--border)] hover:bg-[var(--muted-hover)] disabled:opacity-60"
                          >
                            <div className="min-w-0">
                              <div className="truncate text-[12px] font-semibold text-[var(--foreground)]">
                                {r.first_name} {r.last_name}
                              </div>
                              <div className="truncate text-[10px] text-[var(--muted-foreground)]">
                                {r.grad_year ?? "—"} • {r.event_group || "—"}
                              </div>
                            </div>
                            <div className="ml-3 shrink-0 text-[10px] font-semibold text-[var(--muted-foreground)]">
                              Add
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl bg-[var(--surface-subtle)] p-3 text-[11px] text-[var(--muted-foreground)] ring-1 ring-[var(--border)]">
                    Can’t find a recruit? Add them to the recruiting board first.
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] text-[var(--muted-foreground)]">
                    Event group (optional)
                  </label>
                  <input
                    value={addEventGroup}
                    onChange={(e) => setAddEventGroup(e.target.value)}
                    placeholder="Distance"
                    className="w-full rounded-md bg-[var(--surface)] px-2 py-2 text-xs text-[var(--foreground)] ring-1 ring-[var(--border)] outline-none focus:ring-2 focus:ring-[var(--border)]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-[var(--muted-foreground)]">
                  Notes (optional)
                </label>
                <textarea
                  rows={3}
                  value={addNotes}
                  onChange={(e) => setAddNotes(e.target.value)}
                  placeholder="Why they’re in this scenario / what you’re assuming…"
                  className="w-full rounded-md bg-[var(--surface)] px-2 py-2 text-xs text-[var(--foreground)] ring-1 ring-[var(--border)] outline-none focus:ring-2 focus:ring-[var(--border)]"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddOpen(false)}
                  className="rounded-md bg-[var(--surface-subtle)] px-3 py-2 text-[12px] font-semibold text-[var(--muted-foreground)] ring-1 ring-[var(--border)] hover:bg-[var(--muted-hover)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleAddEntry()}
                  disabled={adding}
                  className="rounded-md bg-[var(--muted)] px-3 py-2 text-[12px] font-semibold text-[var(--foreground)] ring-1 ring-[var(--border)] hover:bg-[var(--muted-hover)] disabled:opacity-60"
                >
                  {adding ? "Adding…" : "Add to scenario"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}