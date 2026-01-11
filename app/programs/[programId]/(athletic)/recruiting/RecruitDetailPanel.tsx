"use client";

import * as React from "react";
import {
  M3StabilizationContributionSection,
  type M3RecruitImpactSummary,
} from "./m3/M3StabilizationContributionSection";
import { useRecruitingM3UI } from "./m3/RecruitingM3UIContext";

type Props = React.HTMLAttributes<HTMLDivElement> & {
  // existing props unchanged
  m3Summary?: M3RecruitImpactSummary | null;
  capabilityNodeNameById: Record<string, string>;

  // ADDITIVE: enables automatic wiring from M3 UI context
  recruitId?: string | null;
};

export function RecruitDetailPanel({
  m3Summary,
  capabilityNodeNameById,
  recruitId,
  className,
  ...rest
}: Props) {
  const m3 = useRecruitingM3UI();

  const resolvedSummary =
    m3Summary ??
    (recruitId ? (m3?.recruitSummariesById?.[recruitId] as M3RecruitImpactSummary) : null) ??
    null;

  const classes = ["recruit-detail-panel", className].filter(Boolean).join(" ");

  return (
    <div className={classes} {...rest}>
      {/* existing evaluation summary */}

      <M3StabilizationContributionSection
        summary={resolvedSummary}
        capabilityNodeNameById={capabilityNodeNameById}
      />

      {/* existing notes / media */}
    </div>
  );
}
