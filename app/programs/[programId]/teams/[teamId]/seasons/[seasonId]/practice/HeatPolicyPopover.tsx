"use client";

import React, { useState } from "react";

type HeatRiskLevel = "low" | "moderate" | "high" | "extreme" | string;

type HeatPolicyGuidelines = {
  low?: string;
  moderate?: string;
  high?: string;
  extreme?: string;
  [key: string]: any;
};

type HeatPolicy = {
  label: string;
  governing_body: string;
  guidelines_json?: HeatPolicyGuidelines;
  low_max?: number | null;
  moderate_min?: number | null;
  moderate_max?: number | null;
  high_min?: number | null;
  high_max?: number | null;
  extreme_min?: number | null;
} | null;

type Props = {
  riskLabel: string;
  riskLevel: HeatRiskLevel;
  policy: HeatPolicy;
};

export default function HeatPolicyPopover({
  riskLabel,
  riskLevel,
  policy,
}: Props) {
  const [open, setOpen] = useState(false);

  // If we don't have a policy yet, just render plain text.
  if (!policy) {
    return (
      <span className="text-[10px] font-medium text-slate-300">
        {riskLabel}
      </span>
    );
  }

  const guidelines: HeatPolicyGuidelines = policy.guidelines_json || {};
  const gbLabel = policy.governing_body?.toUpperCase?.() ?? "GOVERNING BODY";

  function renderRangeFor(level: "low" | "moderate" | "high" | "extreme") {
    const p = policy as NonNullable<HeatPolicy>;
    const {
      low_max,
      moderate_min,
      moderate_max,
      high_min,
      high_max,
      extreme_min,
    } = p;

    switch (level) {
      case "low":
        if (low_max != null) return `WBGT ≤ ${low_max}°${"F"}`;
        return undefined;
      case "moderate":
        if (moderate_min != null && moderate_max != null) {
          return `WBGT ${moderate_min}–${moderate_max}°${"F"}`;
        }
        return undefined;
      case "high":
        if (high_min != null && high_max != null) {
          return `WBGT ${high_min}–${high_max}°${"F"}`;
        }
        return undefined;
      case "extreme":
        if (extreme_min != null) return `WBGT ≥ ${extreme_min}°${"F"}`;
        return undefined;
      default:
        return undefined;
    }
  }

  const levels: { key: "low" | "moderate" | "high" | "extreme"; label: string }[] =
    [
      { key: "low", label: "Low" },
      { key: "moderate", label: "Moderate" },
      { key: "high", label: "High" },
      { key: "extreme", label: "Extreme" },
    ];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[10px] font-medium underline decoration-dotted underline-offset-2 hover:text-emerald-200"
      >
        {riskLabel}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4">
          <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-950 p-4 shadow-xl">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-slate-400">
                  {gbLabel} heat policy
                </div>
                <div className="text-sm font-semibold text-slate-50">
                  {policy.label || "Heat risk guidelines"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-slate-700 px-2 py-0.5 text-[10px] text-slate-300 hover:border-slate-500 hover:text-slate-100"
              >
                Close
              </button>
            </div>

            <div className="mb-3 text-[11px] text-slate-400">
              Clicked risk level:{" "}
              <span className="font-semibold text-slate-100">
                {String(riskLevel || "").toUpperCase() || "UNKNOWN"}
              </span>
            </div>

            <div className="space-y-2 text-[11px] text-slate-200">
              {levels.map(({ key, label }) => {
                const description = guidelines[key];
                const range = renderRangeFor(key);
                const isActive = key === riskLevel;

                return (
                  <div
                    key={key}
                    className={`rounded-md border px-2 py-1.5 ${
                      isActive
                        ? "border-emerald-500/70 bg-emerald-500/5"
                        : "border-slate-700/80 bg-slate-900/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold">
                        {label}
                      </span>
                      {range && (
                        <span className="text-[10px] text-slate-400">
                          {range}
                        </span>
                      )}
                    </div>
                    {description && (
                      <div className="mt-1 text-[10px] text-slate-300">
                        {description}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-3 text-[10px] text-slate-500">
              Policy data comes from your configured governing body profile for
              this season. Always follow your institution&apos;s most current
              written policy when in doubt.
            </div>
          </div>
        </div>
      )}
    </>
  );
}