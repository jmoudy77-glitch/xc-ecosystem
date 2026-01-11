"use client";

import * as React from "react";

type Horizon = "H0" | "H1" | "H2" | "H3";

export type M3RecruitImpactSummary = {
  bandTier: 0 | 1 | 2 | 3;
  capabilityNodeIds: string[];
  horizons: Horizon[];
  rationaleSummaryText?: string;
};

function bandLabel(tier: 0 | 1 | 2 | 3) {
  switch (tier) {
    case 0:
      return "Marginal Impact";
    case 1:
      return "Supportive Impact";
    case 2:
      return "Meaningful Impact";
    case 3:
      return "High-Leverage Impact";
    default:
      return "Impact";
  }
}

function horizonLabel(horizons: Horizon[]) {
  if (!Array.isArray(horizons) || horizons.length === 0) return "H0–H3";
  if (horizons.length === 1) return horizons[0];
  const first = horizons[0];
  const last = horizons[horizons.length - 1];
  return `${first}–${last}`;
}

export function M3StabilizationContributionSection({
  summary,
  capabilityNodeNameById,
}: {
  summary?: M3RecruitImpactSummary | null;
  capabilityNodeNameById: Record<string, string>;
}) {
  if (!summary) return null;

  const label = bandLabel(summary.bandTier);
  const hz = horizonLabel(summary.horizons);

  return (
    <section className="mt-4 rounded-xl ring-1 ring-panel panel-muted p-3">
      <h3 className="text-sm font-semibold mb-1">Stabilization Contribution</h3>

      <div className="text-sm font-medium">{label}</div>

      <ul className="mt-1 text-[12px] text-muted space-y-0.5">
        {summary.capabilityNodeIds.map((id) => (
          <li key={id}>{capabilityNodeNameById[id] ?? "—"}</li>
        ))}
      </ul>

      <div className="mt-1 text-[12px] text-muted">{hz} Window</div>

      {summary.rationaleSummaryText ? (
        <div className="mt-2 text-[12px]">
          <p className="leading-snug">{summary.rationaleSummaryText}</p>
          <span className="block mt-1 text-[11px] text-muted">Advisory signal only.</span>
        </div>
      ) : null}
    </section>
  );
}
