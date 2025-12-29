"use client";

import * as React from "react";
import type { ProgramHealthViewModel } from "./types";
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
  const [selectedAbsenceId, setSelectedAbsenceId] = React.useState<string | null>(null);
  const [truthViewOpen, setTruthViewOpen] = React.useState(false);

  const selectedAbsence = React.useMemo(() => {
    if (!selectedAbsenceId) return null;
    return model.absences.find((a) => a.id === selectedAbsenceId) ?? null;
  }, [model.absences, selectedAbsenceId]);

  return (
    <div className="ph-root">
      <div className="ph-header">
        <div className="ph-title">Program Health</div>
        <div className="ph-controls">
          <button
            className="ph-btn"
            disabled={!selectedAbsenceId}
            onClick={() => setTruthViewOpen(true)}
            title={selectedAbsenceId ? "Open truth view for selected absence" : "Select an absence first"}
          >
            Truth View
          </button>
        </div>
      </div>

      <div className="ph-body">
        <div className="ph-main">
          <CapabilityDriftMap
            capabilityNodes={model.capabilityNodes}
            absences={model.absences}
            selectedAbsenceId={selectedAbsenceId}
            onSelect={setSelectedAbsenceId}
          />
        </div>

        <div className="ph-side">
          <AbsencePanel selectedAbsenceId={selectedAbsenceId} absences={model.absences} />
        </div>
      </div>

      {truthViewOpen && selectedAbsence ? (
        <TruthView
          absence={selectedAbsence}
          onClose={() => setTruthViewOpen(false)}
        />
      ) : null}
    </div>
  );
}
