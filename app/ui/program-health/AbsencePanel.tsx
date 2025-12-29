"use client";

import * as React from "react";
import type { ProgramHealthAbsence } from "./types";

export function AbsencePanel({
  selectedAbsenceId,
  absences,
}: {
  selectedAbsenceId: string | null;
  absences: ProgramHealthAbsence[];
}) {
  const selected =
    selectedAbsenceId == null
      ? null
      : absences.find((a) => a.id === selectedAbsenceId) ?? null;

  if (!selected) {
    return (
      <div className="ph-panel ph-panel-empty">
        <div className="ph-panel-title">Absence</div>
        <div className="ph-panel-muted">Select an absence to view its canonical truth.</div>
      </div>
    );
  }

  return (
    <div className="ph-panel">
      <div className="ph-panel-title">Absence</div>

      <div className="ph-kv">
        <div className="ph-k">horizon</div>
        <div className="ph-v">{selected.horizon}</div>

        <div className="ph-k">absence_type</div>
        <div className="ph-v">{selected.absence_type}</div>

        <div className="ph-k">absence_key</div>
        <div className="ph-v">{selected.absence_key}</div>

        <div className="ph-k">severity</div>
        <div className="ph-v">{selected.severity ?? "unknown"}</div>

        <div className="ph-k">canonical_event_id</div>
        <div className="ph-v ph-mono">{selected.canonical_event_id}</div>

        <div className="ph-k">ledger_id</div>
        <div className="ph-v ph-mono">{selected.ledger_id}</div>
      </div>

      <div className="ph-panel-actions">
        <button className="ph-btn" onClick={() => { /* route stub in v2 */ }}>
          Open causality (stub)
        </button>
      </div>

      <div className="ph-panel-subtitle">details</div>
      <pre className="ph-json">{JSON.stringify(selected.details ?? {}, null, 2)}</pre>
    </div>
  );
}
