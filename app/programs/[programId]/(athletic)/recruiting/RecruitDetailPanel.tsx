"use client";

import * as React from "react";
import {
  M3StabilizationContributionSection,
  type M3RecruitImpactSummary,
} from "./m3/M3StabilizationContributionSection";

type Props = React.HTMLAttributes<HTMLDivElement> & {
  // existing props unchanged
  m3Summary?: M3RecruitImpactSummary | null;
  capabilityNodeNameById: Record<string, string>;
};

export function RecruitDetailPanel({
  m3Summary,
  capabilityNodeNameById,
  className,
  ...rest
}: Props) {
  const classes = ["recruit-detail-panel", className].filter(Boolean).join(" ");

  return (
    <div className={classes} {...rest}>
      {/* existing evaluation summary */}

      <M3StabilizationContributionSection
        summary={m3Summary ?? null}
        capabilityNodeNameById={capabilityNodeNameById}
      />

      {/* existing notes / media */}
    </div>
  );
}
