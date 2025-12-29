"use client";

import * as React from "react";
import type { ProgramHealthSnapshot } from "./types";

function fmtTs(ts: string | null | undefined) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString();
}

export function HorizonTimeline({
  horizon,
  history,
  selectedSnapshotId,
  onSelectSnapshot,
}: {
  horizon: string;
  history: ProgramHealthSnapshot[];
  selectedSnapshotId: string | null;
  onSelectSnapshot: (id: string) => void;
}) {
  return (
    <div className="ph-timeline">
      <div className="ph-timeline-header">
        <div className="ph-panel-subtitle">Horizon Timeline</div>
        <div className="ph-muted">Snapshots are canonical emissions (navigation only).</div>
      </div>

      {!history || history.length === 0 ? (
        <div className="ph-muted">No snapshots available for {horizon}.</div>
      ) : (
        <div className="ph-timeline-list">
          {history.map((s) => {
            const isSel = selectedSnapshotId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                className={`ph-timeline-item ${isSel ? "is-selected" : ""}`}
                onClick={() => onSelectSnapshot(s.id)}
                title={`canonical_event ${String(s.canonical_event_id).slice(0, 8)}…`}
              >
                <div className="ph-timeline-top">
                  <div className="ph-timeline-ts">{fmtTs(s.created_at)}</div>
                  <div className="ph-timeline-meta">{String(s.id).slice(0, 8)}…</div>
                </div>
                <div className="ph-timeline-bottom">
                  <span className="ph-mono">ledger {String(s.ledger_id).slice(0, 8)}…</span>
                  <span className="ph-dot">•</span>
                  <span className="ph-mono">event {String(s.canonical_event_id).slice(0, 8)}…</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
