"use client";

import * as React from "react";
import type { ProgramHealthSnapshot } from "./types";

function fmtTs(ts: string | null | undefined) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString();
}

export function OverviewStrip({
  latestByHorizon,
  onSelectHorizon,
  selectedHorizon,
}: {
  latestByHorizon: Record<string, ProgramHealthSnapshot | null>;
  selectedHorizon: string;
  onSelectHorizon: (h: string) => void;
}) {
  const horizons = ["H0", "H1", "H2", "H3"];

  return (
    <div className="ph-overview">
      {horizons.map((h) => {
        const s = latestByHorizon[h] ?? null;
        const isSel = selectedHorizon === h;
        return (
          <button
            key={h}
            type="button"
            className={`ph-overview-card ${isSel ? "is-selected" : ""}`}
            onClick={() => onSelectHorizon(h)}
            title={s ? `Latest ${h} snapshot: ${fmtTs(s.created_at)}` : `No ${h} snapshots`}
          >
            <div className="ph-overview-h">{h}</div>
            <div className="ph-overview-ts">{s ? fmtTs(s.created_at) : "—"}</div>
            <div className="ph-overview-sub">
              {s ? `ledger ${String(s.ledger_id).slice(0, 8)}…` : "no emission"}
            </div>
          </button>
        );
      })}
    </div>
  );
}
