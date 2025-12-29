"use client";

import * as React from "react";
import type { ProgramHealthViewModel, ProgramHealthAbsence } from "./types";
import { CapabilityDriftMap } from "./CapabilityDriftMap";
import { AbsencePanel } from "./AbsencePanel";
import { TruthView } from "./TruthView";
import "./styles.css";

export function ProgramHealthPage({
  programId,
  model,
}: {
  programId: string;
  model: ProgramHealthViewModel;
}) {
  const [selected, setSelected] = React.useState<ProgramHealthAbsence | null>(null);
  const [truthView, setTruthView] = React.useState(false);

  return (
    <div className="ph-root">
      <div className="ph-header">
        <div className="ph-title">Program Health</div>
        <div className="ph-controls">
          <button className="ph-btn" onClick={() => setTruthView((v) => !v)}>
            {truthView ? "Grid View" : "Truth View"}
          </button>
        </div>
      </div>

      <div className="ph-body">
        <div className="ph-main">
          {truthView ? (
            <TruthView capabilityNodes={model.capabilityNodes} absences={model.absences} onSelect={setSelected} />
          ) : (
            <CapabilityDriftMap capabilityNodes={model.capabilityNodes} absences={model.absences} onSelect={setSelected} />
          )}
        </div>

        <div className="ph-side">
          <AbsencePanel selected={selected} />
        </div>
      </div>
    </div>
  );
}
