"use client";

import * as React from "react";
import type { ProgramHealthAbsence } from "./types";

export function TruthView({
  absence,
  onClose,
}: {
  absence: ProgramHealthAbsence;
  onClose: () => void;
}) {
  return (
    <div className="ph-modal">
      <button className="ph-modal-backdrop" onClick={onClose} type="button" aria-label="Close" />
      <div className="ph-modal-body">
        <div className="ph-modal-header">
          <div className="ph-modal-title">Truth View</div>
          <button className="ph-btn" onClick={onClose} type="button">
            Close
          </button>
        </div>

        <div className="ph-modal-section">
          <div className="ph-panel-subtitle">canonical_event payload</div>
          <pre className="ph-json">{JSON.stringify(absence.details ?? {}, null, 2)}</pre>
        </div>

        <div className="ph-modal-section">
          <div className="ph-panel-subtitle">causal links</div>
          <div className="ph-kv">
            <div className="ph-k">canonical_event_id</div>
            <div className="ph-v ph-mono">{absence.canonical_event_id}</div>

            <div className="ph-k">ledger_id</div>
            <div className="ph-v ph-mono">{absence.ledger_id}</div>

            <div className="ph-k">status</div>
            <div className="ph-v">no causal links provided in model</div>
          </div>
        </div>
      </div>
    </div>
  );
}
