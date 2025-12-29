"use client";

import * as React from "react";
import type { CapabilityNode, ProgramHealthAbsence, Horizon } from "./types";
import { extractCapabilityNodeId } from "./bindings";

const HORIZONS: Horizon[] = ["H0", "H1", "H2", "H3"];

export function TruthView({
  capabilityNodes,
  absences,
  onSelect,
}: {
  capabilityNodes: CapabilityNode[];
  absences: ProgramHealthAbsence[];
  onSelect: (a: ProgramHealthAbsence) => void;
}) {
  const nodeNameById = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const n of capabilityNodes) m.set(n.id, n.name);
    return m;
  }, [capabilityNodes]);

  return (
    <div className="ph-truth">
      {HORIZONS.map((h) => {
        const list = absences.filter((a) => a.horizon === h);
        return (
          <div key={h} className="ph-truth-group">
            <div className="ph-truth-head">{h}</div>
            <div className="ph-truth-list">
              {list.map((a) => {
                const nodeId = extractCapabilityNodeId(a);
                const nodeName = nodeId ? nodeNameById.get(nodeId) : null;
                return (
                  <button key={a.id} className="ph-truth-row" onClick={() => onSelect(a)}>
                    <span className="ph-mono">{a.id.slice(0, 8)}</span>
                    <span>{a.absence_type}</span>
                    <span className="ph-muted">{a.absence_key}</span>
                    <span className="ph-muted">severity={a.severity ?? "unknown"}</span>
                    <span className="ph-muted">{nodeName ? `node=${nodeName}` : "node=unplaced"}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
