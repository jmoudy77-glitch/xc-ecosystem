"use client";

import * as React from "react";
import type { Horizon, ProgramHealthSnapshot } from "./types";

const HORIZONS: Horizon[] = ["H0", "H1", "H2", "H3"];

function fmtTs(ts: string | null | undefined) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString();
}

function shortId(id: string | null | undefined) {
  if (!id) return "—";
  return `${id.slice(0, 8)}…`;
}

type HorizonTimelineProps = {
  snapshot: ProgramHealthSnapshot | null;
  selectedHorizon: Horizon;
  activeHorizon?: Horizon;
  onSelectHorizon: (h: Horizon) => void;
  onOpenTruth?: (h: Horizon) => void;
  onOpenCausality?: (h: Horizon) => void;
  variant?: "rail" | "cards";
};

export function HorizonTimeline({
  snapshot,
  selectedHorizon,
  activeHorizon,
  onSelectHorizon,
}: HorizonTimelineProps) {
  const emittingH = snapshot?.horizon ?? null;

  return (
    <div className="ph-horizon-rail w-[260px] bg-transparent">
      <div className="text-[10px] tracking-[0.2em] uppercase text-white/40">Horizon Rail</div>
      <div className="mt-3 rounded-xl border border-white/10 bg-gradient-to-b from-white/6 via-white/3 to-transparent px-3 py-3">
        <div className="flex flex-col gap-3">
          {HORIZONS.map((h) => {
            const has = emittingH === h;
            const active = (activeHorizon ?? selectedHorizon) === h;
            const pinned = selectedHorizon === h;
            return (
              <button
                key={h}
                type="button"
                onClick={() => onSelectHorizon(h)}
                className="flex items-center gap-3 text-left"
              >
                <span
                  className={[
                    "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                    pinned
                      ? "border-white/22 bg-white/12 text-white/90"
                      : active
                      ? "border-white/18 bg-white/8 text-white/85"
                      : "border-white/10 text-white/70",
                  ].join(" ")}
                >
                  {h}
                </span>
                <span className="h-[2px] flex-1 bg-white/10" />
                {has ? (
                  <span className="text-[10px] text-white/50">{fmtTs(snapshot?.created_at)}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-3 text-[11px] text-white/40">R2.3 HORIZON RAIL LIVE</div>
    </div>
  );
}
