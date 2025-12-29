"use client";

import * as React from "react";
import type { AbsenceTruthModel, ProgramHealthSnapshot, ProgramHealthViewModel } from "./types";
import { CapabilityDriftMap } from "./CapabilityDriftMap";
import { AbsencePanel } from "./AbsencePanel";
import { TruthView } from "./TruthView";
import { OverviewStrip } from "./OverviewStrip";
import { HorizonTimeline } from "./HorizonTimeline";
import { readAbsenceTruth } from "@/app/actions/program-health/readAbsenceTruth";
import { readCanonicalEventGraph } from "@/app/actions/program-health/readCanonicalEventGraph";
import { readLinkedCanonicalEventIds } from "@/app/actions/program-health/readLinkedCanonicalEventIds";
import "./styles.css";

import { SelectionPill } from "./SelectionPill";


function getLatest(model: any): Record<string, ProgramHealthSnapshot | null> {
  return (model?.latestSnapshotsByHorizon ?? {}) as Record<string, ProgramHealthSnapshot | null>;
}

function collectCapabilityNodeIds(value: unknown, ids: Set<string>) {
  if (!value) return;
  if (Array.isArray(value)) {
    value.forEach((item) => collectCapabilityNodeIds(item, ids));
    return;
  }
  if (typeof value !== "object") return;
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (key === "capability_node_id" && typeof entry === "string") {
      ids.add(entry);
      continue;
    }
    collectCapabilityNodeIds(entry, ids);
  }
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
  const latestByHorizon = React.useMemo(() => getLatest(model as any), [model]);

  const snapshots = React.useMemo(() => {
    const modelAny = model as any;
    const raw = modelAny.snapshots ?? (modelAny.snapshot ? [modelAny.snapshot] : []);
    return Array.isArray(raw) ? (raw as ProgramHealthSnapshot[]) : [];
  }, [model]);

  const snapshotsByHorizon = React.useMemo(() => {
    const by = new Map<string, ProgramHealthSnapshot[]>();
    for (const s of snapshots) {
      const h = String(s.horizon ?? "H1");
      if (!by.has(h)) by.set(h, []);
      by.get(h)!.push(s);
    }
    for (const [h, arr] of by.entries()) {
      arr.sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));
      by.set(h, arr);
    }
    return by;
  }, [snapshots]);

  const selectedSnapshot = React.useMemo(() => {
    const arr = snapshotsByHorizon.get(selectedHorizon) ?? [];
    return arr[0] ?? null;
  }, [snapshotsByHorizon, selectedHorizon]);

  const getSnapshotForHorizon = React.useCallback(
    (horizon: string) => {
      const arr = snapshotsByHorizon.get(horizon) ?? [];
      return arr[0] ?? null;
    },
    [snapshotsByHorizon]
  );

  // Truth modal
  const [truthViewOpen, setTruthViewOpen] = React.useState(false);
  const [truthLoading, setTruthLoading] = React.useState(false);
  const [truthError, setTruthError] = React.useState<string | null>(null);
  const [truthModel, setTruthModel] = React.useState<AbsenceTruthModel | null>(null);

  const [truthInitialTab, setTruthInitialTab] = React.useState<"truth" | "causality">("truth");
  const [truthInitialRootEventId, setTruthInitialRootEventId] = React.useState<string | undefined>(
    undefined
  );

  const selectedAbsence = React.useMemo(() => {
    if (!selectedAbsenceId) return null;
    return model.absences.find((a) => a.id === selectedAbsenceId) ?? null;
  }, [model.absences, selectedAbsenceId]);

  const [lineageNodeIds, setLineageNodeIds] = React.useState<string[]>([]);

  // Lineage Highlight overlay
  const [lineageHighlightOn, setLineageHighlightOn] = React.useState(false);
  const [highlightAbsenceIds, setHighlightAbsenceIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!lineageHighlightOn || !selectedAbsence) {
        setHighlightAbsenceIds([]);
        return;
      }

      try {
        const adjacency = await readLinkedCanonicalEventIds(
          programId,
          selectedAbsence.canonical_event_id
        );

        const eventIdSet = new Set(adjacency.linkedEventIds);
        const ids = model.absences
          .filter((a) => eventIdSet.has(a.canonical_event_id))
          .map((a) => a.id);

        if (!cancelled) setHighlightAbsenceIds(ids);
      } catch {
        if (!cancelled) setHighlightAbsenceIds([]);
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [lineageHighlightOn, selectedAbsence, model.absences, programId]);

  React.useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!selectedAbsence?.canonical_event_id) {
        setLineageNodeIds([]);
        return;
      }

      try {
        const graph = await readCanonicalEventGraph(
          programId,
          selectedAbsence.canonical_event_id
        );

        const ids = new Set<string>();
        if ((selectedAbsence.details as any)?.capability_node_id) {
          ids.add(String((selectedAbsence.details as any).capability_node_id));
        }

        collectCapabilityNodeIds(graph.rootEvent?.payload, ids);
        collectCapabilityNodeIds(graph.rootEvent?.causality, ids);

        for (const ev of graph.linkedEvents ?? []) {
          collectCapabilityNodeIds((ev as any).payload, ids);
          collectCapabilityNodeIds((ev as any).causality, ids);
        }

        if (!cancelled) setLineageNodeIds(Array.from(ids));
      } catch {
        if (!cancelled) setLineageNodeIds([]);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [programId, selectedAbsence]);

  async function openTruthForSelectedAbsence(tab: "truth" | "causality") {
    if (!selectedAbsence) return;

    setTruthError(null);
    setTruthLoading(true);
    setTruthModel(null);

    setTruthInitialTab(tab);
    setTruthInitialRootEventId(selectedAbsence.canonical_event_id);

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

  async function openTruthViewForSnapshot(tab: "truth" | "causality", horizon?: string) {
    const snapshot = horizon ? getSnapshotForHorizon(horizon) : selectedSnapshot;
    if (!snapshot) return;

    setTruthError(null);
    setTruthLoading(true);
    setTruthModel(null);

    setTruthInitialTab(tab);
    setTruthInitialRootEventId(snapshot.canonical_event_id);

    try {
      if (selectedAbsenceId) {
        const truth = await readAbsenceTruth(programId, selectedAbsenceId);
        setTruthModel(truth);
      } else {
        // Minimal UI-only shell for opening truth/causality; no invented semantics.
        const shell: AbsenceTruthModel = {
          absence: {
            id: "snapshot",
            program_id: programId as any,
            scope_id: null as any,
            sport: "xc" as any,
            horizon: snapshot.horizon as any,
            absence_key: "snapshot",
            absence_type: "snapshot",
            severity: null as any,
            details: {},
            canonical_event_id: snapshot.canonical_event_id,
            ledger_id: snapshot.ledger_id,
            created_at: snapshot.created_at,
            updated_at: snapshot.created_at,
          } as any,
          canonicalEvent: {
            id: snapshot.canonical_event_id,
            program_id: programId,
            event_domain: "program_health",
            event_type: "snapshot",
            scope_type: "program",
            scope_id: null,
            actor_user_id: null,
            source_system: "runtime",
            causality: {},
            payload: {},
            created_at: snapshot.created_at,
          } as any,
          links: [],
          linkedEvents: [],
        };
        setTruthModel(shell);
      }

      setTruthViewOpen(true);
    } catch (e: any) {
      const msg =
        typeof e?.message === "string" ? e.message : "Failed to open snapshot truth/causality.";
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
    setTruthInitialTab("truth");
    setTruthInitialRootEventId(undefined);
  }

  return (
    <div className="ph-root">
      <div className="ph-header">
        <div className="ph-title">Program Health</div>
        <div className="ph-controls">
          <button
            className="ph-btn"
            disabled={!selectedAbsenceId || truthLoading}
            onClick={() => openTruthForSelectedAbsence("truth")}
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

      <OverviewStrip
        latestByHorizon={latestByHorizon}
        selectedHorizon={selectedHorizon}
        onSelectHorizon={(h) => {
          setSelectedHorizon(h);
        }}
      />

      <div className="ph-body">
        <div className="ph-main">
          <div className="ph-overlaybar">
            <label className="ph-toggle">
              <input
                type="checkbox"
                checked={lineageHighlightOn}
                onChange={(e) => setLineageHighlightOn(e.target.checked)}
                disabled={!selectedAbsenceId}
              />
              <span>Lineage Highlight</span>
            </label>
            <div className="ph-muted">
              {selectedAbsenceId
                ? "Highlights absences adjacent in canonical causality (depth-1)."
                : "Select an absence to enable lineage highlight."}
            </div>
          </div>

          
          <SelectionPill
            selectedAbsence={selectedAbsence}
            onClear={() => setSelectedAbsenceId(null)}
            onOpenTruth={() => openTruthForSelectedAbsence("truth")}
            onOpenCausality={() => openTruthForSelectedAbsence("causality")}
          />

          <CapabilityDriftMap
            capabilityNodes={model.capabilityNodes}
            absences={model.absences}
            selectedAbsenceId={selectedAbsenceId}
            onSelect={setSelectedAbsenceId}
            highlightAbsenceIds={lineageHighlightOn ? highlightAbsenceIds : []}
            lineageNodeIds={lineageNodeIds}
          />
        </div>

        <div className="ph-side">
          <HorizonTimeline
            snapshots={snapshots}
            selectedHorizon={selectedHorizon as "H0" | "H1" | "H2" | "H3"}
            onSelectHorizon={(h) => setSelectedHorizon(h)}
            onOpenSnapshotTruth={(h) => openTruthViewForSnapshot("truth", h)}
            onOpenSnapshotCausality={(h) => openTruthViewForSnapshot("causality", h)}
          />

          {selectedSnapshot ? (
            <div className="ph-panel ph-panel-snapshot">
              <div className="ph-panel-title">Selected Snapshot</div>
              <div className="ph-muted">
                canonical_event_id:{" "}
                <span className="ph-mono">{selectedSnapshot.canonical_event_id}</span>
              </div>

              <div className="ph-row">
                <button
                  type="button"
                  className="ph-btn"
                  onClick={() => openTruthViewForSnapshot("causality")}
                  disabled={truthLoading}
                  title="Open causality drilldown rooted at snapshot canonical event"
                >
                  Open snapshot causality
                </button>
              </div>

              <pre className="ph-json">{JSON.stringify(selectedSnapshot.summary ?? {}, null, 2)}</pre>
            </div>
          ) : null}

          <AbsencePanel
            programId={programId}
            absences={model.absences}
            selectedAbsenceId={selectedAbsenceId}
            selectedAbsence={selectedAbsence}
            onSelectAbsence={setSelectedAbsenceId}
            onOpenTruth={() => openTruthForSelectedAbsence("truth")}
            onOpenCausality={() => openTruthForSelectedAbsence("causality")}
          />
        </div>
      </div>

      {truthViewOpen && truthModel ? (
        <TruthView
          truth={truthModel}
          programId={programId}
          onClose={closeTruthView}
          initialTab={truthInitialTab}
          initialRootEventId={truthInitialRootEventId}
        />
      ) : null}
    </div>
  );
}
