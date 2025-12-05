"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type SeasonBudgetControlsProps = {
  programId: string;
  teamId: string;
  seasonId: string;
  initialEquiv: number | null;
  initialAmount: number | null;
  currency: string | null;
};

export default function SeasonBudgetControls({
  programId,
  teamId,
  seasonId,
  initialEquiv,
  initialAmount,
  currency,
}: SeasonBudgetControlsProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [equiv, setEquiv] = useState<string>(
    initialEquiv != null ? String(initialEquiv) : ""
  );
  const [amount, setAmount] = useState<string>(
    initialAmount != null ? String(initialAmount) : ""
  );
  const [currencyCode, setCurrencyCode] = useState<string>(currency ?? "USD");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasExistingBudget =
    initialEquiv != null || initialAmount != null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsedEquiv =
      equiv.trim() === "" ? null : Number.parseFloat(equiv);
    const parsedAmount =
      amount.trim() === "" ? null : Number.parseFloat(amount);

    if (
      (parsedEquiv != null && Number.isNaN(parsedEquiv)) ||
      (parsedAmount != null && Number.isNaN(parsedAmount))
    ) {
      setError("Please enter valid numeric values.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/programs/${programId}/teams/${teamId}/seasons/${seasonId}/budget`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              scholarship_budget_equivalents: parsedEquiv,
              scholarship_budget_amount: parsedAmount,
              scholarship_currency: currencyCode,
            }),
          }
        );

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          const msg =
            body?.error ||
            `Failed to save budget (status ${res.status}).`;
          setError(msg);
          return;
        }

        setIsOpen(false);
        // Refresh the server component so the summary + gauge update
        router.refresh();
      } catch (err: any) {
        console.error("[SeasonBudgetControls] save error:", err);
        setError("Unexpected error saving budget. Please try again.");
      }
    });
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="text-[10px] rounded bg-slate-800 px-2 py-1 text-slate-200 hover:bg-slate-700"
      >
        {hasExistingBudget ? "Edit budget" : "Set budget"}
      </button>

      {isOpen && (
        <form
          onSubmit={handleSave}
          className="mt-2 w-64 rounded-lg border border-slate-800 bg-slate-950 p-3 text-left shadow-lg"
        >
          <p className="mb-2 text-[11px] font-semibold text-slate-200">
            Season scholarship budget
          </p>

          <div className="mb-2">
            <label className="block text-[10px] text-slate-400">
              Equivalency budget (total scholarships)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={equiv}
              onChange={(e) => setEquiv(e.target.value)}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-sky-500"
              placeholder="e.g. 12.60"
            />
          </div>

          <div className="mb-2">
            <label className="block text-[10px] text-slate-400">
              Total budget amount ({currencyCode})
            </label>
            <input
              type="number"
              step="100"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-sky-500"
              placeholder="e.g. 250000"
            />
          </div>

          <div className="mb-2">
            <label className="block text-[10px] text-slate-400">
              Currency
            </label>
            <input
              type="text"
              value={currencyCode}
              onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
              className="mt-1 w-20 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-sky-500"
            />
          </div>

          {error && (
            <p className="mb-2 text-[10px] text-rose-400">{error}</p>
          )}

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[10px] px-2 py-1 text-slate-400 hover:text-slate-200"
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="text-[10px] rounded bg-sky-600 px-3 py-1 text-white hover:bg-sky-500 disabled:opacity-60"
            >
              {isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}