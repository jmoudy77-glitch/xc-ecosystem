"use client";

import * as React from "react";
import type { AbsenceTruthModel, ProgramHealthSnapshot, ProgramHealthViewModel } from "./types";
import { CapabilityDriftMap } from "./CapabilityDriftMap";
import { AbsencePanel } from "./AbsencePanel";
import { TruthView } from "./TruthView";
import { OverviewStrip } from "./OverviewStrip";
import { HorizonTimeline } from "./HorizonTimeline";
import { readAbsenceTruth } from "@/app/actions/program-health/readAbsenceTruth";
import "./styles.css";

function getHistory(model: any, horizon: string): ProgramHealthSnapshot[] {
  return (model?.snapshotHistoryByHorizon?.[horizon] ?? []) as ProgramHealthSnapshot[];
}

function getLatest(model: any): Record<string, ProgramHealthSnapshot | null> {
  return (model?.latestSnapshotsByHorizon ?? {}) as Record<string, ProgramHealthSnapshot | null>;
}

export function ProgramHealthPage({
  programId,
  model,
}: {
  programId: string;
  model: ProgramHealthViewModel;
}) {
  const [selectedAbsenceId, setSelectedAbsenceId] = React.useState<string | null>(null);

  // Timeline state (navigation only)
  const [selectedHorizon, setSelectedHorizon] = React.useState<string>("H0");
  const history = React.useMemo(
    () => getHistory(model as any, selectedHorizon),
    [model, selectedHorizon]
  );
  const latestByHorizon = React.useMemo(() => getLatest(model as any), [model]);

  const [selectedSnapshotId, setSelectedSnapshotId] = React.useState<string | null>(null);
  const selectedSnapshot = React.useMemo(() => {
    if (!selectedSnapshotId) return null;
    return history.find((s) => s.id === selectedSnapshotId) ?? null;
  }, [history, selectedSnapshotId]);

  const [truthViewOpen, setTruthViewOpen] = React.useState(false);
  const [truthLoading, setTruthLoading] = React.useState(false);
  const [truthError, setTruthError] = React.useState<string | null>(null);
  const [truthModel, setTruthModel] = React.useState<AbsenceTruthModel | null>(null);

  const selectedAbsence = React.useMemo(() => {
    if (!selectedAbsenceId) return null;
    return model.absences.find((a) => a.id === selectedAbsenceId) ?? null;
  }, [model.absences, selectedAbsenceId]);

  async function openTruthView() {
    if (!selectedAbsence) return;

    setTruthError(null);
    setTruthLoading(true);
    setTruthModel(null);

    try {
      const truth = await readAbsenceTruth(programId, selectedAbsence.id);
      setTruthModel(truth);
      setTruthViewOpen(true);
    } catch (e: any) {
      const msg =
        typeof e?.message === "string"
          ? e.message
          : "Failed to load canonical truth for selected absence.";
      setTruthError(msg);
      setTruthViewOpen(false);
    } finally {
      setTruthLoading(false);
    }
  }

  function closeTruthView() {
    setTruthViewOpen(false);
    setTruthModel(null);
    setTruthError(null);
  }

  return (
    <div className="ph-root">
      <div className="ph-header">
        <div className="ph-title">Program Health</div>
        <div className="ph-controls">
          <button
            className="ph-btn"
            disabled={!selectedAbsenceId || truthLoading}
            onClick={openTruthView}
            title={
              !selectedAbsenceId
                ? "Select an absence first"
                : truthLoading
                  ? "Loading canonical truth…"
                  : "Open truth view for selected absence"
            }
          >
            {truthLoading ? "Loading…" : "Truth View"}
          </button>
        </div>
      </div>

      {truthError ? (
        <div className="ph-banner ph-banner-error">
          <div className="ph-banner-title">Truth read failed</div>
          <div className="ph-banner-body">{truthError}</div>
        </div>
      ) : null}

      {/* Program Health Overview (latest snapshot per horizon) */}
      <OverviewStrip
        latestByHorizon={latestByHorizon}
        selectedHorizon={selectedHorizon}
        onSelectHorizon={(h) => {
          setSelectedHorizon(h);
          setSelectedSnapshotId(null);
        }}
      />

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
          {/* Horizon Timeline (navigation only) */}
          <HorizonTimeline
            horizon={selectedHorizon}
            history={history}
            selectedSnapshotId={selectedSnapshotId}
            onSelectSnapshot={setSelectedSnapshotId}
          />

          {/* Selected snapshot (raw reveal) */}
          {selectedSnapshot ? (
            <div className="ph-panel ph-panel-snapshot">
              <div className="ph-panel-title">Selected Snapshot (raw)</div>
              <div className="ph-muted">
                This is a canonical runtime emission. UI does not compute or interpret it.
              </div>
              <pre className="ph-json">{JSON.stringify(selectedSnapshot.summary ?? {}, null, 2)}</pre>
            </div>
          ) : null}

          {/* Active absences (now) */}
          <AbsencePanel selectedAbsenceId={selectedAbsenceId} absences={model.absences} />
        </div>
      </div>

      {truthViewOpen && truthModel ? (
        <TruthView truth={truthModel} onClose={closeTruthView} />
      ) : null}
    </div>
  );
}
