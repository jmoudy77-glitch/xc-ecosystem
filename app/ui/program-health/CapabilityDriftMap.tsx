"use client";

import * as React from "react";
import type { CapabilityNode, ProgramHealthAbsence, Horizon } from "./types";
import { extractCapabilityNodeId } from "./bindings";

const HORIZONS: Horizon[] = ["H0", "H1", "H2", "H3"];
const MAX_HOLES_PER_CELL = 4;

function severityKey(s: string | null | undefined) {
  return (s ?? "unknown").toLowerCase();
}

export function CapabilityDriftMap({
  capabilityNodes,
  absences,
  onSelect,
}: {
  capabilityNodes: CapabilityNode[];
  absences: ProgramHealthAbsence[];
  onSelect: (a: ProgramHealthAbsence) => void;
}) {
  const placed: Record<string, Record<Horizon, ProgramHealthAbsence[]>> = {};
  const unplaced: Record<Horizon, ProgramHealthAbsence[]> = { H0: [], H1: [], H2: [], H3: [] };

  for (const a of absences) {
    const nodeId = extractCapabilityNodeId(a);
    if (!nodeId) {
      unplaced[a.horizon].push(a);
      continue;
    }
    if (!placed[nodeId]) placed[nodeId] = { H0: [], H1: [], H2: [], H3: [] };
    placed[nodeId][a.horizon].push(a);
  }

  const rows: Array<{ id: string; label: string; isUnplaced?: boolean }> = [
    ...capabilityNodes.map((n) => ({ id: n.id, label: n.name })),
    { id: "__unplaced__", label: "Unplaced (no canonical node binding)", isUnplaced: true },
  ];

  function cellAbsences(rowId: string, h: Horizon) {
    if (rowId === "__unplaced__") return unplaced[h];
    return placed[rowId]?.[h] ?? [];
  }

  function cellSeverityState(list: ProgramHealthAbsence[]) {
    if (list.length === 0) return "none";
    const set = new Set(list.map((a) => severityKey(a.severity)));
    if (set.size === 1) return Array.from(set)[0];
    return "mixed";
  }

  return (
    <div className="ph-grid">
      <div className="ph-grid-head">
        <div className="ph-grid-corner" />
        {HORIZONS.map((h) => (
          <div key={h} className="ph-grid-colhead">
            {h}
          </div>
        ))}
      </div>

      <div className="ph-grid-body">
        {rows.map((r) => (
          <div key={r.id} className={`ph-grid-row ${r.isUnplaced ? "is-unplaced" : ""}`}>
            <div className="ph-grid-rowhead">{r.label}</div>
            {HORIZONS.map((h) => {
              const list = cellAbsences(r.id, h);
              const severityState = cellSeverityState(list);
              const visible = list.slice(0, MAX_HOLES_PER_CELL);
              const overflow = list.length - visible.length;

              return (
                <div key={h} className="ph-cell">
                  <div className="ph-mat">
                    <div className="ph-holes">
                      {visible.map((a) => (
                        <button
                          key={a.id}
                          className={`ph-hole sev-${severityKey(a.severity)}`}
                          onClick={() => onSelect(a)}
                          title={`${a.absence_type} | ${a.absence_key} | severity=${a.severity ?? "unknown"} | ${a.horizon}`}
                        />
                      ))}
                      {overflow > 0 && (
                        <button
                          className="ph-overflow"
                          onClick={() => {
                            onSelect(list[0]);
                          }}
                          title={`+${overflow} more`}
                        >
                          +{overflow}
                        </button>
                      )}
                    </div>

                    <div className="ph-truth-strip">
                      <span>{h}</span>
                      <span className="ph-dot">.</span>
                      <span>{list.length} absences</span>
                      <span className="ph-dot">.</span>
                      <span>severity: {severityState}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
