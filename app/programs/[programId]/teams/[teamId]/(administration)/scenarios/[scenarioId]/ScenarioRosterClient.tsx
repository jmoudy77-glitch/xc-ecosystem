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


type Props = {
  programId: string;
  teamId: string;
  scenarioId: string;
  isManager: boolean;
  initialEntries?: ScenarioEntry[];
};

export default function ScenarioRosterClient({
  programId,
  teamId,
  scenarioId,
  isManager,
  initialEntries = [],
}: Props) {
  const router = useRouter();

  const [entries, setEntries] = useState<ScenarioEntry[]>(initialEntries ?? []);

  // Rehydrate entries when server-side data changes (e.g., after router.refresh())
  useEffect(() => {
    setEntries(initialEntries ?? []);
  }, [initialEntries]);

  // Athlete modal (scenario context)
  const [selectedEntry, setSelectedEntry] = useState<ScenarioEntry | null>(null);
  const [draftAmount, setDraftAmount] = useState<string>("");
  const [draftUnit, setDraftUnit] = useState<"percent" | "amount">("percent");
  const [draftNotes, setDraftNotes] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  function openEntryModal(entry: ScenarioEntry) {
    setSelectedEntry(entry);
    setDraftAmount(entry.scholarshipAmount != null ? String(entry.scholarshipAmount) : "");
    setDraftUnit((entry.scholarshipUnit as "percent" | "amount") || "percent");
    setDraftNotes(entry.scholarshipNotes ?? "");
    setModalError(null);
    setSaving(false);
  }

  function closeEntryModal() {
    setSelectedEntry(null);
    setDraftAmount("");
    setDraftUnit("percent");
    setDraftNotes("");
    setModalError(null);
    setSaving(false);
  }

  async function saveEntryModal() {
    if (!selectedEntry) return;

    const trimmed = draftAmount.trim();
    let amountPayload: number | null = null;
    if (trimmed.length > 0) {
      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed)) {
        setModalError("Amount must be a valid number");
        return;
      }
      amountPayload = parsed;
    }

    setSaving(true);
    setModalError(null);

    try {
      const res = await fetch(
        `/api/programs/${programId}/teams/${teamId}/roster-scenarios/${scenarioId}/entries/${selectedEntry.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scholarship_amount: amountPayload,
            scholarship_unit: draftUnit,
            scholarship_notes: draftNotes,
          }),
        }
      );

      const body = await res.json();
      if (!res.ok) {
        setModalError(body.error || "Failed to update scholarship");
        setSaving(false);
        return;
      }

      const updated = body.entry as any;

      setEntries((prev) =>
        prev.map((e) =>
          e.id === selectedEntry.id
            ? {
                ...e,
                scholarshipAmount: (updated.scholarship_amount as number | null) ?? null,
                scholarshipUnit: (updated.scholarship_unit as string | null) ?? null,
                scholarshipNotes: (updated.scholarship_notes as string | null) ?? null,
              }
            : e
        )
      );

      router.refresh();
      setSaving(false);
      closeEntryModal();
    } catch (e: any) {
      setModalError(e?.message || "Unexpected error");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Existing entries */}
      <div className="space-y-2">

        {(entries?.length ?? 0) === 0 ? (
          <p className="text-[11px] text-slate-500">
            No athletes in this scenario yet. Add athletes from your current
            roster or recruiting board below.
          </p>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => {
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
                  role="button"
                  tabIndex={0}
                  onClick={() => openEntryModal(entry)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openEntryModal(entry);
                    }
                  }}
                  className="flex cursor-pointer flex-col gap-2 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 hover:bg-slate-900/90 md:flex-row md:items-center md:justify-between"
                  title="Click to edit (scenario)"
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
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* Scenario athlete modal (reused layout from Active Roster modal) */}
      {selectedEntry ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/60"
            onClick={closeEntryModal}
          />

          <div className="relative mx-4 flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-surface-2 ring-1 ring-subtle shadow-2xl text-[color:var(--text)]">
            {/* Zone 1: Identity Header (fixed) */}
            <div className="flex items-start justify-between gap-4 border-b border-subtle bg-surface-1 px-5 py-4">
              <div className="flex min-w-0 items-start gap-3">
                <div className="h-12 w-10 overflow-hidden rounded-lg bg-surface-2 ring-1 ring-subtle">
                  {/* Scenario entries do not currently provide avatar_url; keep placeholder for now */}
                  <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-subtle">
                    —
                  </div>
                </div>

                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold">{selectedEntry.name}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                    <span className="rounded-full bg-surface-1 px-2.5 py-1 ring-1 ring-subtle">
                      Grad: <span className="font-semibold text-[color:var(--text)]">{selectedEntry.gradYear ?? "—"}</span>
                    </span>
                    {selectedEntry.status ? (
                      <span className="rounded-full bg-surface-1 px-2.5 py-1 ring-1 ring-subtle">
                        Status: <span className="font-semibold text-[color:var(--text)]">{selectedEntry.status}</span>
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="shrink-0 rounded-lg border border-subtle bg-surface-2 px-3 py-1.5 text-[11px] font-semibold hover:bg-surface-1"
                onClick={closeEntryModal}
              >
                Close
              </button>
            </div>

            {/* Zone 2: Profile (scrollable, read-only placeholder) */}
            <div className="flex-1 overflow-y-auto bg-surface-2 px-5 py-4">
              <div className="space-y-3">
                <section className="rounded-xl bg-surface-1 p-4 ring-1 ring-subtle">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted">Overview</h3>
                    <span className="text-[10px] text-subtle">Scenario</span>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Name</p>
                      <p className="mt-1 text-[12px] font-semibold">{selectedEntry.name}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Grad Year</p>
                      <p className="mt-1 text-[12px] font-semibold">{selectedEntry.gradYear ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Role</p>
                      <p className="mt-1 text-[12px] font-semibold">{selectedEntry.role ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Scholarship</p>
                      <p className="mt-1 text-[12px] font-semibold">
                        {selectedEntry.scholarshipAmount !== null && selectedEntry.scholarshipUnit
                          ? `${selectedEntry.scholarshipAmount}${selectedEntry.scholarshipUnit === "percent" ? "%" : ""}`
                          : "—"}
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            </div>

            {/* Zone 3: Scenario Administration (fixed) */}
            {isManager ? (
              <div className="border-t border-subtle bg-surface-1 px-5 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[12px] font-semibold">Scenario Administration</h3>
                  <span className="text-[10px] text-subtle">Edits apply to this scenario only</span>
                </div>

                {modalError ? <p className="mt-2 text-[11px] text-rose-400">{modalError}</p> : null}

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-muted">Amount</label>
                    <input
                      value={draftAmount}
                      onChange={(e) => setDraftAmount(e.target.value)}
                      placeholder={draftUnit === "percent" ? "e.g., 75" : "e.g., 8500"}
                      className="mt-1 w-full rounded-md border border-subtle bg-surface-2 px-2 py-1.5 text-xs text-[color:var(--text)] outline-none focus:border-[color:var(--brand)]"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-muted">Unit</label>
                    <select
                      value={draftUnit}
                      onChange={(e) => setDraftUnit(e.target.value as "percent" | "amount")}
                      className="mt-1 w-full rounded-md border border-subtle bg-surface-2 px-2 py-1.5 text-xs text-[color:var(--text)] outline-none focus:border-[color:var(--brand)]"
                    >
                      <option value="percent">% equiv</option>
                      <option value="amount">$ amount</option>
                    </select>
                  </div>
                  <div className="sm:col-span-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-muted">Notes</label>
                    <textarea
                      value={draftNotes}
                      onChange={(e) => setDraftNotes(e.target.value)}
                      rows={2}
                      placeholder="Notes (optional)…"
                      className="mt-1 w-full rounded-md border border-subtle bg-surface-2 px-2 py-1.5 text-xs text-[color:var(--text)] outline-none focus:border-[color:var(--brand)]"
                    />
                  </div>
                </div>

                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeEntryModal}
                    className="rounded-md border border-subtle bg-surface-2 px-3 py-2 text-[11px] font-semibold hover:bg-surface-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveEntryModal}
                    disabled={saving}
                    className="rounded-md bg-[color:var(--brand)] px-3 py-2 text-[11px] font-semibold text-white hover:opacity-90 disabled:opacity-60"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}