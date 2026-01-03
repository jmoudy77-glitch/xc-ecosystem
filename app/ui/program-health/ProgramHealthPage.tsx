// FILE: app/ui/program-health/ProgramHealthPage.tsx

"use client";

import * as React from "react";
import type { AbsenceTruthModel, ProgramHealthViewModel } from "./types";
import { CapabilityDriftMap } from "./CapabilityDriftMap";
import { TruthView } from "./TruthView";
import { readAbsenceTruth } from "@/app/actions/program-health/readAbsenceTruth";
import { readCanonicalEventGraph } from "@/app/actions/program-health/readCanonicalEventGraph";
import { readLinkedCanonicalEventIds } from "@/app/actions/program-health/readLinkedCanonicalEventIds";
import "./styles.css";

import { SelectionPill } from "./SelectionPill";

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

function shortId(id: string | null | undefined) {
  if (!id) return "—";
  return `${id.slice(0, 8)}…`;
}

function fmtTs(ts: string | null | undefined) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString();
}

function severityLabel(severity: string | null | undefined) {
  if (!severity) return "unknown";
  return String(severity).toLowerCase();
}

export function ProgramHealthPage({
  programId,
  model,
}: {
  programId: string;
  model: ProgramHealthViewModel;
}) {
  const [selectedAbsenceId, setSelectedAbsenceId] = React.useState<string | null>(null);
  const [hoveredAbsence, setHoveredAbsence] = React.useState<{
    capabilityLabel: string;
    level: "critical" | "high" | "medium" | "low";
  } | null>(null);

  const leftDockRef = React.useRef<HTMLDivElement | null>(null);
  const [discTopPx, setDiscTopPx] = React.useState<number | null>(null);

  // Timeline state (navigation only)
  const [selectedHorizon, setSelectedHorizon] = React.useState<"H0" | "H1" | "H2" | "H3">(
    model.snapshot?.horizon ?? "H1"
  );

  const snapshot = model.snapshot ?? null;
  const selectedSnapshot = React.useMemo(
    () => (snapshot && snapshot.horizon === selectedHorizon ? snapshot : null),
    [snapshot, selectedHorizon]
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

  const capabilityById = React.useMemo(() => {
    return new Map(model.capabilityNodes.map((node) => [node.id, node]));
  }, [model.capabilityNodes]);

  const selectedCapabilityLabel = React.useMemo(() => {
    if (!selectedAbsence) return "Unknown capability";
    const details = (selectedAbsence.details ?? {}) as any;
    const nodeId = details?.capability_node_id as string | undefined;
    const node = nodeId ? capabilityById.get(nodeId) : null;
    return node?.name ?? node?.node_code ?? nodeId ?? "Capability";
  }, [selectedAbsence, capabilityById]);

  const selectedSummary = React.useMemo(() => {
    if (!selectedAbsence) return null;
    const details = (selectedAbsence.details ?? {}) as any;
    const summary = details?.summary ?? details?.reason ?? details?.message ?? details?.description ?? null;
    return typeof summary === "string" ? summary : null;
  }, [selectedAbsence]);

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
        const adjacency = await readLinkedCanonicalEventIds(programId, selectedAbsence.canonical_event_id);

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
        const graph = await readCanonicalEventGraph(programId, selectedAbsence.canonical_event_id);

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

  // Disc vertical placement hook (used by styles.css via --ph-disc-top)
  React.useEffect(() => {
    const measure = () => {
      const el = leftDockRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const bottom = rect.bottom;
      const top = bottom + 192;
      setDiscTopPx(top);
    };

    measure();
    window.addEventListener("resize", measure);
    const t = window.setTimeout(measure, 200);

    return () => {
      window.removeEventListener("resize", measure);
      window.clearTimeout(t);
    };
  }, []);

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
    const target = horizon
      ? snapshot && snapshot.horizon === horizon
        ? snapshot
        : null
      : selectedSnapshot;
    if (!target) return;

    setTruthError(null);
    setTruthLoading(true);
    setTruthModel(null);

    setTruthInitialTab(tab);
    setTruthInitialRootEventId(target.canonical_event_id);

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
            horizon: target.horizon as any,
            absence_key: "snapshot",
            absence_type: "snapshot",
            severity: null as any,
            details: {},
            canonical_event_id: target.canonical_event_id,
            ledger_id: target.ledger_id,
            created_at: target.created_at,
            updated_at: target.created_at,
          } as any,
          canonicalEvent: {
            id: target.canonical_event_id,
            program_id: programId,
            event_domain: "program_health",
            event_type: "snapshot",
            scope_type: "program",
            scope_id: null,
            actor_user_id: null,
            source_system: "runtime",
            causality: {},
            payload: {},
            created_at: target.created_at,
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

  console.log("[PH UI]", {
    programId,
    nodeCount: model.capabilityNodes?.length ?? 0,
    absenceCount: model.absences?.length ?? 0,
    firstAbsenceNodeId:
      (model.absences?.[0] as any)?.capabilityNodeId ??
      ((model.absences?.[0] as any)?.details?.capability_node_id ?? null),
  });

  return (
    <main
      className="ph-root ph-field"
      style={
        discTopPx
          ? ({ ["--ph-disc-top" as any]: `${discTopPx}px` } as React.CSSProperties)
          : undefined
      }
    >
      <div className="ph-field-plane" aria-label="Program Health Instrument Field">
        <CapabilityDriftMap
          capabilityNodes={model.capabilityNodes}
          absences={model.absences}
          snapshot={snapshot}
          selectedHorizon={selectedHorizon}
          onSelectHorizon={setSelectedHorizon}
          selectedAbsenceId={selectedAbsenceId}
          onSelect={setSelectedAbsenceId}
          highlightAbsenceIds={lineageHighlightOn ? highlightAbsenceIds : []}
          lineageNodeIds={lineageNodeIds}
          showUnmapped={false}
          onAbsenceHover={(_absenceId, summary) => setHoveredAbsence(summary)}
          onAbsenceSelect={setSelectedAbsenceId}
        />
      </div>

      <div className="ph-overlay-anchor">
        <div className="ph-dock ph-dock-top">
          <div className="ph-topbar">
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
        </div>

        <div ref={leftDockRef} className="ph-dock ph-dock-left">
          <div className="ph-glass ph-left-stack">
            <div className="ph-left-head">
              <div className="ph-left-subtitle">Capability Drift Map</div>
            </div>

            {truthError ? <div className="ph-glass ph-error-pill">{truthError}</div> : null}

            <SelectionPill
              selectedAbsence={selectedAbsence}
              onClear={() => setSelectedAbsenceId(null)}
              onOpenTruth={() => openTruthForSelectedAbsence("truth")}
              onOpenCausality={() => openTruthForSelectedAbsence("causality")}
            />

            {hoveredAbsence ? (
              <div className="ph-glass ph-hover-pill">
                <span className="truncate">
                  {hoveredAbsence.capabilityLabel} • {hoveredAbsence.level}
                </span>
              </div>
            ) : null}

            <label className="ph-glass ph-toggle-pill">
              <input
                type="checkbox"
                checked={lineageHighlightOn}
                onChange={(e) => setLineageHighlightOn(e.target.checked)}
                disabled={!selectedAbsenceId}
              />
              <span>Lineage highlight</span>
            </label>
          </div>
        </div>

        {selectedAbsence ? (
          <div className="ph-dock ph-dock-inspector">
            <div className="ph-glass ph-inspector-card">
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-semibold text-white/90">{selectedCapabilityLabel}</div>
                <button
                  type="button"
                  className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-white/70"
                  onClick={() => setSelectedAbsenceId(null)}
                >
                  Clear
                </button>
              </div>

              <div className="mt-1 text-xs text-white/60">
                {selectedAbsence.horizon ?? "—"} • {severityLabel(selectedAbsence.severity)}
              </div>

              <dl className="mt-3 space-y-2 text-xs">
                <div>
                  <dt className="text-white/50">canonical event</dt>
                  <dd className="text-white/80">{shortId(selectedAbsence.canonical_event_id)}</dd>
                </div>
                <div>
                  <dt className="text-white/50">emitted</dt>
                  <dd className="text-white/80">{fmtTs(selectedAbsence.created_at)}</dd>
                </div>
                {selectedSummary ? (
                  <div>
                    <dt className="text-white/50">summary</dt>
                    <dd className="text-white/80">{selectedSummary}</dd>
                  </div>
                ) : null}
                {selectedAbsence.details?.capability_node_id ? (
                  <div>
                    <dt className="text-white/50">node</dt>
                    <dd className="text-white/80">{selectedAbsence.details?.capability_node_id}</dd>
                  </div>
                ) : null}
              </dl>

              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/80"
                  onClick={() => openTruthForSelectedAbsence("truth")}
                >
                  Truth
                </button>
                <button
                  type="button"
                  className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/80"
                  onClick={() => openTruthForSelectedAbsence("causality")}
                >
                  Causality
                </button>
              </div>
            </div>
          </div>
        ) : null}
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
    </main>
  );
}
