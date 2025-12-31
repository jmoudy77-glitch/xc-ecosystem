"use client";

import * as React from "react";
import type { Horizon } from "./types";

const CANONICAL_ELEMENTS = [
  { key: "Authority", label: "AUTH" },
  { key: "Capacity", label: "CAP" },
  { key: "Coverage", label: "COV" },
  { key: "Continuity", label: "CONT" },
  { key: "Certification", label: "CERT" },
  { key: "Redundancy", label: "RED" },
] as const;

const HORIZON_LABEL: Record<Horizon, string> = {
  H0: "Now",
  H1: "Precarious",
  H2: "Critical",
  H3: "Absent",
};

function levelForHorizon(h: Horizon): number {
  // Placeholder until runtime wiring:
  // Map horizon severity into 0..5 bars for compact glyphs.
  if (h === "H0") return 2; // moderate
  if (h === "H1") return 3;
  if (h === "H2") return 4;
  return 5; // H3
}

function VerticalBars({ value, max = 5 }: { value: number; max?: number }) {
  const n = Math.max(1, max);
  const v = Math.max(0, Math.min(value, n));
  return (
    <span className="inline-flex flex-col items-center justify-end gap-[2px]">
      {Array.from({ length: n }).map((_, i) => {
        // Fill from bottom up
        const filled = i >= n - v;
        return (
          <span
            key={i}
            className={[
              "h-[6px] w-[20px] rounded-[2px] border",
              filled
                ? "border-white/30 bg-white/65"
                : "border-white/14 bg-white/6",
            ].join(" ")}
          />
        );
      })}
    </span>
  );
}

export type HorizonGlyphRailProps = {
  activeHorizon: Horizon;
  pinnedHorizon: Horizon;
  isPinnedByClick: boolean;
};

export function HorizonGlyphRail({
  activeHorizon,
  pinnedHorizon,
  isPinnedByClick,
}: HorizonGlyphRailProps) {
  const lvl = levelForHorizon(activeHorizon);

  return (
    <div className="w-[820px] max-w-[calc(100vw-48px)] select-none">
      <div className="rounded-2xl border border-white/10 bg-[rgba(0,0,0,0.38)] backdrop-blur-md p-[2px] shadow-[0_12px_50px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <div className="text-[11px] font-semibold text-white/85">
              {activeHorizon} <span className="text-white/55">— {HORIZON_LABEL[activeHorizon]}</span>
            </div>
            <div className="text-[10px] text-white/40">
              {isPinnedByClick ? "pinned" : "preview"}
            </div>
          </div>

          <div className="text-[10px] text-white/40">
            pinned: <span className="text-white/70">{pinnedHorizon}</span>
          </div>
        </div>

        <div className="mt-[3px] mb-[3px] flex flex-nowrap items-end justify-center gap-6 overflow-hidden">
          {CANONICAL_ELEMENTS.map((el) => (
            <div key={el.key} className="flex items-end gap-3">
              <div className="text-[11px] font-semibold text-white/75 tracking-[0.08em] whitespace-nowrap">
                {el.label}
              </div>
              <VerticalBars value={lvl} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
