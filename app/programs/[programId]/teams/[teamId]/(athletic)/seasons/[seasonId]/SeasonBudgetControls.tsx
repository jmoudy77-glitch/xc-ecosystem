"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  programId: string;
  teamId: string;
  seasonId: string;
  initialEquiv: number | null;
  initialAmount: number | null;
  currency: string;
  initialIsLocked?: boolean;
};

export default function SeasonBudgetControls({
  programId,
  teamId,
  seasonId,
  initialEquiv,
  initialAmount,
  currency,
  initialIsLocked = false,
}: Props) {
  const router = useRouter();

  const [equiv, setEquiv] = useState(initialEquiv !== null ? String(initialEquiv) : "");
  const [amount, setAmount] = useState(initialAmount !== null ? String(initialAmount) : "");
  const [saving, setSaving] = useState(false);
  const [isLocked, setIsLocked] = useState(initialIsLocked);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/programs/${programId}/teams/${teamId}/seasons/${seasonId}/budget`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scholarship_budget_equivalents: equiv === "" ? null : Number(equiv),
            scholarship_budget_amount: amount === "" ? null : Number(amount),
            scholarship_currency: currency,
          }),
        }
      );

      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Failed to update budget.");
        setSaving(false);
        return;
      }

      router.refresh();
      setSaving(false);
    } catch (err: any) {
      setError(err.message || "Unexpected error.");
      setSaving(false);
    }
  }

  async function toggleLock(target: boolean) {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/programs/${programId}/teams/${teamId}/seasons/${seasonId}/lock`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_locked: target }),
        }
      );

      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Failed to update lock state.");
        setSaving(false);
        return;
      }

      setIsLocked(target);
      router.refresh();
      setSaving(false);
    } catch (err: any) {
      setError(err.message || "Unexpected error.");
      setSaving(false);
    }
  }

  return (
    <div className="w-full max-w-xs rounded-lg border border-slate-800 bg-slate-900/70 p-4">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        Season Budget Controls
      </p>

      {/* Lock Banner */}
      {isLocked && (
        <p className="mb-3 rounded-md border border-rose-600/40 bg-rose-900/40 px-3 py-2 text-[11px] text-rose-100">
          Season is locked. Scholarships cannot be edited.
        </p>
      )}

      <div className="space-y-3">
        {/* Equivalency input */}
        <div>
          <label className="block text-[10px] font-medium text-slate-400">
            Equivalency budget (eq)
          </label>
          <input
            type="number"
            step="0.01"
            disabled={isLocked}
            value={equiv}
            onChange={(e) => setEquiv(e.target.value)}
            placeholder="e.g., 12.6"
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-sky-500"
          />
        </div>

        {/* Dollar budget input */}
        <div>
          <label className="block text-[10px] font-medium text-slate-400">
            Scholarship budget ({currency})
          </label>
          <input
            type="number"
            step="500"
            disabled={isLocked}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g., 150000"
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-sky-500"
          />
        </div>

        {error && <p className="text-[11px] text-rose-400">{error}</p>}

        <button
          disabled={saving || isLocked}
          onClick={handleSave}
          className="w-full rounded-md bg-sky-600 px-3 py-1 text-[11px] font-semibold text-slate-950 hover:bg-sky-500 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save Budget"}
        </button>

        {/* Lock / Unlock Controls */}
        <button
          disabled={saving}
          onClick={() => toggleLock(!isLocked)}
          className={`w-full rounded-md px-3 py-1 text-[11px] font-semibold ${
            isLocked
              ? "border border-emerald-400/40 bg-emerald-900/40 text-emerald-200 hover:bg-emerald-800/40"
              : "border border-rose-400/40 bg-rose-900/40 text-rose-200 hover:bg-rose-800/40"
          }`}
        >
          {isLocked ? "Unlock Season" : "Lock Season"}
        </button>
      </div>
    </div>
  );
}