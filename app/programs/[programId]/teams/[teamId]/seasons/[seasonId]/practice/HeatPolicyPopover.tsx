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
  children?: React.ReactNode;
  weather?: {
    wetBulbF?: number | null;
    wetBulbC?: number | null;
    wbgtF?: number | null;
    wbgtC?: number | null;
    tempMinF?: number | null;
    tempMaxF?: number | null;
    tempMinC?: number | null;
    tempMaxC?: number | null;
    humidityPercent?: number | null;
    windMph?: number | null;
    windKph?: number | null;
    summary?: string | null;
  };
};

export default function HeatPolicyPopover({
  riskLabel,
  riskLevel,
  policy,
  children,
  weather,
}: Props) {
  const [open, setOpen] = useState(false);

  // If we don't have a policy yet, just render children or plain text.
  if (!policy) {
    if (children) {
      return <>{children}</>;
    }
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

  const normalizedLevel = String(riskLevel || "").toLowerCase();
  const activeKey = (["low", "moderate", "high", "extreme"] as const).includes(
    normalizedLevel as any
  )
    ? (normalizedLevel as "low" | "moderate" | "high" | "extreme")
    : undefined;

  const activeMeta = activeKey
    ? levels.find((l) => l.key === activeKey) ?? null
    : null;

  const activeRange = activeKey ? renderRangeFor(activeKey) : undefined;
  const activeDescription =
    activeKey && guidelines ? guidelines[activeKey] : undefined;

  const riskLabelText = activeMeta?.label ?? "Unknown";

  const badgeClasses =
    activeKey === "low"
      ? "border-emerald-500/70 bg-emerald-500/10 text-emerald-200"
      : activeKey === "moderate"
      ? "border-amber-500/70 bg-amber-500/10 text-amber-200"
      : activeKey === "high"
      ? "border-orange-500/70 bg-orange-500/10 text-orange-200"
      : activeKey === "extreme"
      ? "border-red-500/70 bg-red-500/10 text-red-200"
      : "border-slate-500/60 bg-slate-800/60 text-slate-200";

  const cardBorderBgClasses =
    activeKey === "low"
      ? "border-emerald-500/70 bg-emerald-500/5"
      : activeKey === "moderate"
      ? "border-amber-500/70 bg-amber-500/5"
      : activeKey === "high"
      ? "border-orange-500/70 bg-orange-500/5"
      : activeKey === "extreme"
      ? "border-red-500/70 bg-red-500/5"
      : "border-slate-600 bg-slate-900/60";

  const wetBulbDisplay =
    weather?.wetBulbF != null
      ? `${weather.wetBulbF.toFixed(1)}°F`
      : weather?.wetBulbC != null
      ? `${weather.wetBulbC.toFixed(1)}°C`
      : undefined;

  const wbgtDisplay =
    weather?.wbgtF != null
      ? `${weather.wbgtF.toFixed(1)}°F`
      : weather?.wbgtC != null
      ? `${weather.wbgtC.toFixed(1)}°C`
      : undefined;

  const tempDisplay =
    weather?.tempMinF != null && weather?.tempMaxF != null
      ? `${weather.tempMinF.toFixed(0)}–${weather.tempMaxF.toFixed(0)}°F`
      : weather?.tempMinC != null && weather?.tempMaxC != null
      ? `${weather.tempMinC.toFixed(0)}–${weather.tempMaxC.toFixed(0)}°C`
      : undefined;

  const humidityDisplay =
    weather?.humidityPercent != null
      ? `${weather.humidityPercent.toFixed(0)}%`
      : undefined;

  const windDisplay =
    weather?.windMph != null
      ? `${weather.windMph.toFixed(0)} mph`
      : weather?.windKph != null
      ? `${weather.windKph.toFixed(0)} kph`
      : undefined;

  return (
    <>
      {children ? (
        <div onClick={() => setOpen(true)} className="h-full">
          {children}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-[10px] font-medium underline decoration-dotted underline-offset-2 hover:text-emerald-200"
        >
          {riskLabel}
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-950 p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-slate-400">
                  {gbLabel} heat policy
                </div>
                <div className="text-sm font-semibold text-slate-50">
                  {policy.label || "Heat risk guidelines"}
                </div>
                <div className="mt-1">
                  <span
                    className={`inline-flex items-center rounded-full border px-1.5 py-[1px] text-[10px] uppercase tracking-wide ${badgeClasses}`}
                  >
                    {riskLabelText} risk
                  </span>
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
              Heat category for this session:{" "}
              <span className="font-semibold text-slate-100">
                {activeMeta?.label ?? "Unknown"}
              </span>
            </div>

            <div className="space-y-2 text-[11px] text-slate-200">
              <div className={`rounded-md border px-2 py-1.5 ${cardBorderBgClasses}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold">
                    {riskLabelText}
                  </span>
                  {activeRange && (
                    <span className="text-[10px] text-slate-400">
                      {activeRange}
                    </span>
                  )}
                </div>
                {activeDescription && (
                  <div className="mt-1 text-[10px] text-slate-300">
                    {activeDescription}
                  </div>
                )}
                {!activeDescription && (
                  <div className="mt-1 text-[10px] text-slate-400">
                    No specific guidelines are configured for this category yet.
                  </div>
                )}
              </div>
            </div>

            {(wetBulbDisplay ||
              wbgtDisplay ||
              tempDisplay ||
              humidityDisplay ||
              windDisplay ||
              weather?.summary) && (
              <div className="mt-3 space-y-1.5 text-[11px] text-slate-200">
                <div className="text-[11px] font-semibold text-slate-300">
                  Session weather snapshot
                </div>
                {wetBulbDisplay && (
                  <div>
                    Wet bulb: <span className="text-slate-100">{wetBulbDisplay}</span>
                  </div>
                )}
                {wbgtDisplay && (
                  <div>
                    WBGT: <span className="text-slate-100">{wbgtDisplay}</span>
                  </div>
                )}
                {tempDisplay && (
                  <div>
                    Air temp range: <span className="text-slate-100">{tempDisplay}</span>
                  </div>
                )}
                {humidityDisplay && (
                  <div>
                    Humidity: <span className="text-slate-100">{humidityDisplay}</span>
                  </div>
                )}
                {windDisplay && (
                  <div>
                    Wind: <span className="text-slate-100">{windDisplay}</span>
                  </div>
                )}
                {weather?.summary && (
                  <div>
                    Conditions: <span className="text-slate-100">{weather.summary}</span>
                  </div>
                )}
              </div>
            )}

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