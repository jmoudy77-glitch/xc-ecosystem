"use client";

import * as React from "react";

export type M3RecruitImpactSummary = {
  bandTier: 0 | 1 | 2 | 3;
  horizons: Array<"H0" | "H1" | "H2" | "H3">;
} & Record<string, any>;

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

function horizonLabel(horizons: Array<"H0" | "H1" | "H2" | "H3">) {
  if (!Array.isArray(horizons) || horizons.length === 0) return "H0–H3";
  if (horizons.length === 1) return horizons[0];
  const first = horizons[0];
  const last = horizons[horizons.length - 1];
  return `${first}–${last}`;
}

export function M3ImpactGlyph({
  summary,
  tooltipMode = "title",
}: {
  summary?: M3RecruitImpactSummary | null;
  tooltipMode?: "title" | "none";
}) {
  if (!summary) return null;

  const label = bandLabel(summary.bandTier);
  const hz = horizonLabel(summary.horizons);

  const title =
    tooltipMode === "title"
      ? `${label}\nAddresses ${hz} stabilization gaps`
      : undefined;

  return (
    <div
      aria-label={`Recruiting insight available: ${label}`}
      title={title}
      className="h-4 w-4 rounded-full ring-1 ring-panel opacity-80"
    />
  );
}
