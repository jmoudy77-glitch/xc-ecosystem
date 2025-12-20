"use client";

import { useState, useMemo } from "react";

type Props = {
  budgetEquiv: number | null;
  usedEquiv: number | null;
  budgetAmount: number | null;
  usedAmount: number | null;
  currency: string;
};

export default function ScholarshipWhatIf({
  budgetEquiv,
  usedEquiv,
  budgetAmount,
  usedAmount,
  currency,
}: Props) {
  const [open, setOpen] = useState(false);
  const [deltaEquiv, setDeltaEquiv] = useState<string>("");
  const [deltaAmount, setDeltaAmount] = useState<string>("");

  const parsedDeltaEquiv =
    deltaEquiv.trim() === "" ? 0 : Number.parseFloat(deltaEquiv);
  const parsedDeltaAmount =
    deltaAmount.trim() === "" ? 0 : Number.parseFloat(deltaAmount);

  const {
    newUsedEquiv,
    newRemainingEquiv,
    overEquiv,
    newUsedAmount,
    newRemainingAmount,
    overAmount,
  } = useMemo(() => {
    let newUsedEquiv: number | null = null;
    let newRemainingEquiv: number | null = null;
    let overEquiv: number | null = null;

    if (
      budgetEquiv != null &&
      usedEquiv != null &&
      !Number.isNaN(parsedDeltaEquiv)
    ) {
      newUsedEquiv = usedEquiv + parsedDeltaEquiv;
      newRemainingEquiv = budgetEquiv - newUsedEquiv;
      overEquiv = newRemainingEquiv < 0 ? -newRemainingEquiv : 0;
    }

    let newUsedAmount: number | null = null;
    let newRemainingAmount: number | null = null;
    let overAmount: number | null = null;

    if (
      budgetAmount != null &&
      usedAmount != null &&
      !Number.isNaN(parsedDeltaAmount)
    ) {
      newUsedAmount = usedAmount + parsedDeltaAmount;
      newRemainingAmount = budgetAmount - newUsedAmount;
      overAmount = newRemainingAmount < 0 ? -newRemainingAmount : 0;
    }

    return {
      newUsedEquiv,
      newRemainingEquiv,
      overEquiv,
      newUsedAmount,
      newRemainingAmount,
      overAmount,
    };
  }, [
    budgetEquiv,
    usedEquiv,
    budgetAmount,
    usedAmount,
    parsedDeltaEquiv,
    parsedDeltaAmount,
  ]);

  const hasEquivBudget = budgetEquiv != null && usedEquiv != null;
  const hasAmountBudget = budgetAmount != null && usedAmount != null;

  if (!hasEquivBudget && !hasAmountBudget) {
    // Nothing meaningful to simulate
    return null;
  }

  return (
    <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/80 p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-[11px] font-semibold text-slate-200"
      >
        <span>What-if calculator</span>
        <span className="text-[10px] text-slate-400">
          {open ? "Hide" : "Show"}
        </span>
      </button>

      {open && (
        <div className="mt-3 space-y-3 text-[11px] text-slate-200">
          <p className="text-[10px] text-slate-400">
            Try hypothetical awards without saving changes. Great for quick
            negotiations and planning.
          </p>

          {hasEquivBudget && (
            <div>
              <label className="block text-[10px] text-slate-400">
                Extra equivalencies to award (Δ eq)
              </label>
              <input
                type="number"
                step="0.01"
                value={deltaEquiv}
                onChange={(e) => setDeltaEquiv(e.target.value)}
                placeholder="e.g., 0.50"
                className="mt-1 w-32 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-sky-500"
              />
              {newUsedEquiv != null && newRemainingEquiv != null && (
                <p className="mt-1 text-[10px]">
                  New used:{" "}
                  <span className="font-semibold">
                    {newUsedEquiv.toFixed(2)} / {budgetEquiv!.toFixed(2)} eq
                  </span>{" "}
                  • Remaining:{" "}
                  <span
                    className={
                      newRemainingEquiv < 0
                        ? "font-semibold text-rose-300"
                        : "font-semibold text-emerald-300"
                    }
                  >
                    {newRemainingEquiv.toFixed(2)} eq
                  </span>
                  {overEquiv != null && overEquiv > 0 && (
                    <span className="ml-1 text-rose-300">
                      (over by {overEquiv.toFixed(2)} eq)
                    </span>
                  )}
                </p>
              )}
            </div>
          )}

          {hasAmountBudget && (
            <div>
              <label className="block text-[10px] text-slate-400">
                Extra scholarship dollars to award (Δ {currency})
              </label>
              <input
                type="number"
                step="100"
                value={deltaAmount}
                onChange={(e) => setDeltaAmount(e.target.value)}
                placeholder="e.g., 15000"
                className="mt-1 w-40 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-sky-500"
              />
              {newUsedAmount != null && newRemainingAmount != null && (
                <p className="mt-1 text-[10px]">
                  New used:{" "}
                  <span className="font-semibold">
                    {newUsedAmount.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}{" "}
                    /{" "}
                    {budgetAmount!.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}{" "}
                    {currency}
                  </span>{" "}
                  • Remaining:{" "}
                  <span
                    className={
                      newRemainingAmount < 0
                        ? "font-semibold text-rose-300"
                        : "font-semibold text-emerald-300"
                    }
                  >
                    {newRemainingAmount.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}{" "}
                    {currency}
                  </span>
                  {overAmount != null && overAmount > 0 && (
                    <span className="ml-1 text-rose-300">
                      (over by{" "}
                      {overAmount.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}{" "}
                      {currency})
                    </span>
                  )}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}