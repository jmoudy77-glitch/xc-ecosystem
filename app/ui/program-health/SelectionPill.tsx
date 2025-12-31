"use client";

import * as React from "react";
import type { ProgramHealthAbsence } from "./types";

function shortId(id: string | null | undefined) {
  if (!id) return "—";
  return `${id.slice(0, 8)}…`;
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // silent
  }
}

export function SelectionPill({
  selectedAbsence,
  onClear,
  onOpenTruth,
  onOpenCausality,
}: {
  selectedAbsence: ProgramHealthAbsence | null;
  onClear: () => void;
  onOpenTruth: () => void;
  onOpenCausality: () => void;
}) {
  if (!selectedAbsence) {
    return (
      <div className="ph-selection-pill is-empty" role="status" aria-live="polite">
        <div className="ph-selection-body">No selection</div>
      </div>
    );
  }

  const horizon = selectedAbsence.horizon ?? "—";
  const typ = selectedAbsence.absence_type ?? "—";
  const key = selectedAbsence.absence_key ?? "—";
  const cevt = selectedAbsence.canonical_event_id ?? "";
  const ledg = selectedAbsence.ledger_id ?? "";

  return (
    <div className="ph-selection-pill" role="status" aria-live="polite">
      <div className="ph-selection-left">
        <div className="ph-selection-title">Selected</div>
        <div className="ph-selection-body">
          <span className="ph-pill">{horizon}</span>
          <span className="ph-selection-type">{typ}</span>
          <span className="ph-selection-key ph-mono">{key}</span>
          <span className="ph-dot">•</span>
          <span className="ph-selection-meta">
            cevt <span className="ph-mono">{shortId(cevt)}</span>
          </span>
          <span className="ph-selection-meta">
            ledg <span className="ph-mono">{shortId(ledg)}</span>
          </span>
        </div>
      </div>

      <div className="ph-selection-actions">
        <button type="button" className="ph-btn ph-btn-ghost" onClick={onClear} title="Clear selection">
          Clear
        </button>

        <button
          type="button"
          className="ph-btn ph-btn-ghost"
          onClick={() => copyToClipboard(cevt)}
          title="Copy canonical_event_id"
        >
          Copy cevt
        </button>

        <button
          type="button"
          className="ph-btn ph-btn-ghost"
          onClick={() => copyToClipboard(ledg)}
          title="Copy ledger_id"
        >
          Copy ledg
        </button>

        <button type="button" className="ph-btn" onClick={onOpenTruth} title="Open Truth tab">
          Truth
        </button>

        <button type="button" className="ph-btn" onClick={onOpenCausality} title="Open Causality tab">
          Causality
        </button>
      </div>
    </div>
  );
}
