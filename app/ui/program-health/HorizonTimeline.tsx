"use client";

import * as React from "react";
import type { ProgramHealthSnapshot } from "./types";

type Horizon = "H0" | "H1" | "H2" | "H3";

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

function depthClass(h: Horizon) {
  if (h === "H0") return "ph-depth-h0";
  if (h === "H1") return "ph-depth-h1";
  if (h === "H2") return "ph-depth-h2";
  return "ph-depth-h3";
}

export function HorizonTimeline({
  snapshots,
  selectedHorizon,
  onSelectHorizon,
  onOpenSnapshotTruth,
  onOpenSnapshotCausality,
}: {
  snapshots: ProgramHealthSnapshot[];
  selectedHorizon: Horizon;
  onSelectHorizon: (h: Horizon) => void;
  onOpenSnapshotTruth?: (h: Horizon) => void;
  onOpenSnapshotCausality?: (h: Horizon) => void;
}) {
  const safeSnapshots = (snapshots ?? []) as ProgramHealthSnapshot[];
  const byH = React.useMemo(() => {
    const m = new Map<Horizon, ProgramHealthSnapshot[]>();
    for (const h of ["H0", "H1", "H2", "H3"] as Horizon[]) m.set(h, []);
    for (const s of safeSnapshots) {
      const h = (s.horizon ?? "H1") as Horizon;
      if (!m.has(h)) m.set(h, []);
      m.get(h)!.push(s);
    }
    for (const [h, arr] of m.entries()) {
      arr.sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));
      m.set(h, arr);
    }
    return m;
  }, [safeSnapshots]);

  return (
    <div className="ph-depth-timeline">
      <div className="ph-panel-title">Horizon Timeline</div>
      <div className="ph-muted">
        Snapshots are canonical emissions (navigation only). Horizon is rendered as depth bands.
      </div>

      <div className="ph-depth-grid">
        {(["H0", "H1", "H2", "H3"] as Horizon[]).map((h) => {
          const arr = byH.get(h) ?? [];
          const latest = arr[0] ?? null;
          const active = selectedHorizon === h;

          return (
            <div
              key={h}
              className={[
                "ph-depth-card",
                depthClass(h),
                active ? "is-active" : "",
                latest ? "has-emission" : "is-empty",
              ].join(" ")}
              onClick={() => onSelectHorizon(h)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onSelectHorizon(h);
              }}
              title={`Select ${h}`}
            >
              <div className="ph-depth-card-top">
                <div className="ph-depth-label">{h}</div>
                <div className="ph-depth-sub">
                  {latest ? fmtTs(latest.created_at) : "No emission"}
                </div>
              </div>

              <div className="ph-depth-card-body">
                {latest ? (
                  <>
                    <div className="ph-depth-meta">
                      ledger <span className="ph-mono">{shortId(latest.ledger_id)}</span>
                    </div>
                    <div className="ph-depth-meta">
                      cevt <span className="ph-mono">{shortId(latest.canonical_event_id)}</span>
                    </div>
                  </>
                ) : (
                  <div className="ph-depth-empty">
                    This depth band currently contains no canonical snapshot.
                  </div>
                )}
              </div>

              <div className="ph-depth-card-actions">
                <button
                  type="button"
                  className="ph-btn ph-btn-ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenSnapshotTruth?.(h);
                  }}
                  disabled={!latest}
                  title="Open snapshot truth"
                >
                  Truth
                </button>
                <button
                  type="button"
                  className="ph-btn ph-btn-ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenSnapshotCausality?.(h);
                  }}
                  disabled={!latest}
                  title="Open snapshot causality"
                >
                  Causality
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="ph-muted">
        Selected band: <span className="ph-mono">{selectedHorizon}</span>
      </div>
    </div>
  );
}
