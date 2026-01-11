"use client";

import * as React from "react";
import { M3CapabilitySupportDot } from "./m3/M3CapabilitySupportDot";

type Props = {
  // existing props unchanged
  capabilityNodeId: string;

  // ADDITIVE: M3 support map (inactive-safe)
  m3SupportById?: Record<string, { isSupported: boolean }> | null;
};

export function StabilizationDeficitRow({
  capabilityNodeId,
  m3SupportById,
  ...rest
}: Props) {
  const supported = !!m3SupportById?.[capabilityNodeId]?.isSupported;

  return (
    <div className="flex items-center justify-between gap-2" {...rest}>
      <div className="min-w-0">
        {/* existing deficit row content */}
      </div>

      <M3CapabilitySupportDot supported={supported} />
    </div>
  );
}
