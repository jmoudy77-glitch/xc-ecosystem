"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ScenarioEntry = {
  id: string;
  athleteId: string | null;
  programRecruitId: string | null;
  athleteName: string;
  gradYear: number | null;
  scholarshipAmount: number | null;
  scholarshipUnit: string;
  scholarshipNotes: string | null;
  createdAt: string | null;
};

type Props = {
  programId: string;
  teamId: string;
  scenarioId: string;
  initialEntries: ScenarioEntry[];
  unitLabel: string; // for display only
};

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
      <section className="rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-5 mt-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Scenario entries
        </p>
        <p className="mt-2 text-[11px] text-slate-500">
          No athletes have been added to this scenario yet. Once you add
          athletes or recruits, you&rsquo;ll be able to assign scholarship
          amounts here.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 mt-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Scenario entries
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Edit scholarship amounts and notes for each athlete in this
            scenario. Changes here only affect this sandbox.
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-2 text-[11px] text-rose-400">
          {error}
        </p>
      )}

      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-[10px] text-slate-400">
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
                className="border-b border-slate-850/50 last:border-0"
              >
                <td className="px-2 py-1 text-slate-100">
                  {entry.athleteName}
                </td>
                <td className="px-2 py-1 text-slate-300">
                  {entry.gradYear ?? "—"}
                </td>
                <td className="px-2 py-1">
                  <input
                    type="number"
                    step="0.01"
                    className="w-24 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500"
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
                    className="w-full min-w-[180px] rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500"
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
                    className="rounded-md bg-sky-600 px-3 py-1 text-[11px] font-semibold text-slate-950 hover:bg-sky-500 disabled:opacity-60"
                  >
                    {savingId === entry.id ? "Saving…" : "Save"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}