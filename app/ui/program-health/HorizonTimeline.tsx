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
  onSelectHorizon: (h: Horizon) => void;
  onOpenTruth?: (h: Horizon) => void;
  onOpenCausality?: (h: Horizon) => void;
  variant?: "rail" | "cards";
};

export function HorizonTimeline({
  snapshot,
  selectedHorizon,
  onSelectHorizon,
  onOpenTruth,
  onOpenCausality,
  variant = "cards",
}: HorizonTimelineProps) {
  // v1: only one canonical emission available in the view model; render that horizon as emitting.
  const emittingH = snapshot?.horizon ?? null;

  if (variant === "rail") {
    return (
      <div className="flex items-center gap-2 overflow-x-auto">
        {HORIZONS.map((h) => {
          const has = emittingH === h;
          const active = selectedHorizon === h;

          return (
            <div
              key={h}
              role="button"
              tabIndex={0}
              onClick={() => onSelectHorizon(h)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectHorizon(h);
                }
              }}
              className={[
                "flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 min-w-[180px]",
                active ? "ring-1 ring-white/20" : "",
              ].join(" ")}
            >
              <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] font-semibold">
                {h}
              </span>
              <div className="flex-1 min-w-0 text-xs">
                <div className="truncate">
                  {has ? fmtTs(snapshot?.created_at) : "No emission"}
                </div>
              </div>
              {has ? (
                <div className="flex items-center gap-1">
                  {onOpenTruth ? (
                    <button
                      type="button"
                      className="rounded-full border border-white/10 px-2 py-1 text-[11px]"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenTruth(h);
                      }}
                    >
                      Truth
                    </button>
                  ) : null}
                  {onOpenCausality ? (
                    <button
                      type="button"
                      className="rounded-full border border-white/10 px-2 py-1 text-[11px]"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenCausality(h);
                      }}
                    >
                      Causality
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="ph-panel ph-timeline">
      <div className="ph-panel-title">Horizon Timeline</div>
      <div className="ph-panel-muted">
        Snapshots are canonical emissions (navigation only). Depth is rendered as bands.
      </div>

      <div className="ph-depth-grid">
        {HORIZONS.map((h) => {
          const has = emittingH === h;
          const active = selectedHorizon === h;

          return (
            <button
              key={h}
              type="button"
              className={[
                "ph-depth-card",
                `depth-${h.toLowerCase()}`,
                has ? "has-emission" : "is-empty",
                active ? "is-active" : "",
              ].join(" ")}
              onClick={() => onSelectHorizon(h)}
              title={`Select ${h}`}
            >
              <div className="ph-depth-top">
                <div className="ph-depth-label">{h}</div>
                <div className="ph-depth-sub">{has ? fmtTs(snapshot?.created_at) : "No emission"}</div>
              </div>

              <div className="ph-depth-body">
                {has ? (
                  <>
                    <div className="ph-depth-meta">
                      ledger <span className="ph-mono">{shortId(snapshot?.ledger_id)}</span>
                    </div>
                    <div className="ph-depth-meta">
                      cevt <span className="ph-mono">{shortId(snapshot?.canonical_event_id)}</span>
                    </div>
                  </>
                ) : (
                  <div className="ph-depth-empty">
                    This depth band currently contains no canonical snapshot.
                  </div>
                )}
              </div>

              <div className="ph-depth-actions">
                <span className="ph-spacer" />
                <span className="ph-actions">
                  <span className="ph-action">
                    <span className="ph-action-label">Truth</span>
                    <input
                      type="button"
                      className="ph-btn ph-btn-mini"
                      value="Open"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenTruth?.(h);
                      }}
                      disabled={!has}
                    />
                  </span>
                  <span className="ph-action">
                    <span className="ph-action-label">Causality</span>
                    <input
                      type="button"
                      className="ph-btn ph-btn-mini"
                      value="Open"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenCausality?.(h);
                      }}
                      disabled={!has}
                    />
                  </span>
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="ph-panel-muted">
        Selected band: <span className="ph-mono">{selectedHorizon}</span>
      </div>
    </div>
  );
}
