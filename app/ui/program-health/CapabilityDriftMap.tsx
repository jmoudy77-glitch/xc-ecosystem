"use client";

import * as React from "react";
import type { ProgramHealthAbsence, ProgramHealthCapabilityNode } from "./types";

type Props = {
  capabilityNodes: ProgramHealthCapabilityNode[];
  absences: ProgramHealthAbsence[];
  selectedAbsenceId: string | null;
  onSelect: (absenceId: string) => void;
  highlightAbsenceIds?: string[];
  lineageNodeIds?: string[];
};

const COLS = 6;

function sevBucket(
  severity: string | null | undefined
): "critical" | "high" | "medium" | "low" | "unknown" {
  const s = (severity ?? "").toLowerCase();
  if (s.includes("critical")) return "critical";
  if (s.includes("high")) return "high";
  if (s.includes("medium")) return "medium";
  if (s.includes("low")) return "low";
  return "unknown";
}

function sizeBucket(sev: ReturnType<typeof sevBucket>): "xl" | "lg" | "md" | "sm" {
  if (sev === "critical") return "xl";
  if (sev === "high") return "lg";
  if (sev === "medium") return "md";
  return "sm";
}

function horizonDepthClass(h: string | null | undefined) {
  const x = (h ?? "").toUpperCase();
  if (x === "H0") return "hdepth-h0";
  if (x === "H1") return "hdepth-h1";
  if (x === "H2") return "hdepth-h2";
  if (x === "H3") return "hdepth-h3";
  return "hdepth-h1";
}

export function CapabilityDriftMap({
  capabilityNodes,
  absences,
  selectedAbsenceId,
  onSelect,
  highlightAbsenceIds,
  lineageNodeIds,
}: Props) {
  const highlightSet = React.useMemo(
    () => new Set(highlightAbsenceIds ?? []),
    [highlightAbsenceIds]
  );
  const lineageSet = React.useMemo(() => new Set(lineageNodeIds ?? []), [lineageNodeIds]);

  const nodes = React.useMemo(() => {
    return [...capabilityNodes].sort((a, b) => {
      const ac = (a.node_code ?? "").localeCompare(b.node_code ?? "");
      if (ac !== 0) return ac;
      return (a.name ?? "").localeCompare(b.name ?? "");
    });
  }, [capabilityNodes]);

  const nodeIndexById = React.useMemo(() => {
    const m = new Map<string, number>();
    nodes.forEach((n, i) => m.set(n.id, i));
    return m;
  }, [nodes]);

  const absencesByNodeId = React.useMemo(() => {
    const m = new Map<string, ProgramHealthAbsence[]>();
    const unmapped: ProgramHealthAbsence[] = [];

    for (const a of absences) {
      const details = (a.details ?? {}) as any;
      const capabilityNodeId = details?.capability_node_id as string | undefined;

      if (capabilityNodeId && nodeIndexById.has(capabilityNodeId)) {
        const arr = m.get(capabilityNodeId) ?? [];
        arr.push(a);
        m.set(capabilityNodeId, arr);
      } else {
        unmapped.push(a);
      }
    }

    for (const [k, arr] of m.entries()) {
      arr.sort((x, y) => {
        const hc = String(x.horizon ?? "").localeCompare(String(y.horizon ?? ""));
        if (hc !== 0) return hc;
        const tc = String(x.absence_type ?? "").localeCompare(String(y.absence_type ?? ""));
        if (tc !== 0) return tc;
        return String(x.absence_key ?? "").localeCompare(String(y.absence_key ?? ""));
      });
      m.set(k, arr);
    }

    unmapped.sort((x, y) => {
      const hc = String(x.horizon ?? "").localeCompare(String(y.horizon ?? ""));
      if (hc !== 0) return hc;
      const tc = String(x.absence_type ?? "").localeCompare(String(y.absence_type ?? ""));
      if (tc !== 0) return tc;
      return String(x.absence_key ?? "").localeCompare(String(y.absence_key ?? ""));
    });

    return { mapped: m, unmapped };
  }, [absences, nodeIndexById]);

  const rows = Math.max(1, Math.ceil(nodes.length / COLS));
  const hasSelection = Boolean(selectedAbsenceId);
  const planeRef = React.useRef<HTMLDivElement | null>(null);

  React.useLayoutEffect(() => {
    const plane = planeRef.current;
    if (!plane) return;

    const svg = plane.querySelector<SVGSVGElement>(".ph-lineage-svg");
    if (!svg) return;

    const draw = () => {
      while (svg.firstChild) svg.removeChild(svg.firstChild);

      if (lineageSet.size < 2) return;

      const planeRect = plane.getBoundingClientRect();
      const plates = Array.from(plane.querySelectorAll<HTMLElement>("[data-node-id]")).filter(
        (el) => {
          const id = el.dataset.nodeId ?? "";
          return lineageSet.has(id);
        }
      );

      if (plates.length < 2) return;

      const centerOf = (el: HTMLElement) => {
        const r = el.getBoundingClientRect();
        return { x: r.left - planeRect.left + r.width / 2, y: r.top - planeRect.top + r.height / 2 };
      };

      for (let i = 0; i < plates.length - 1; i += 1) {
        const a = centerOf(plates[i]);
        const b = centerOf(plates[i + 1]);
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", String(a.x));
        line.setAttribute("y1", String(a.y));
        line.setAttribute("x2", String(b.x));
        line.setAttribute("y2", String(b.y));
        line.setAttribute("class", "ph-lineage-line");
        svg.appendChild(line);
      }
    };

    const raf = requestAnimationFrame(draw);
    const onResize = () => requestAnimationFrame(draw);
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [lineageSet, nodes]);

  return (
    <div className="ph-map-v1 ph-structural-truth">
      <div className="ph-map-v1-header">
        <div>
          <div className="ph-panel-title">Capability Drift Map</div>
          <div className="ph-muted">
            Structural plane. Voids are runtime absence emissions. Horizon is rendered as depth (navigation only).
          </div>
        </div>

        <div className="ph-map-v1-legend">
          <div className="ph-legend-chip">
            <span className="ph-sev-dot critical" /> critical
          </div>
          <div className="ph-legend-chip">
            <span className="ph-sev-dot high" /> high
          </div>
          <div className="ph-legend-chip">
            <span className="ph-sev-dot medium" /> medium
          </div>
          <div className="ph-legend-chip">
            <span className="ph-sev-dot low" /> low
          </div>
        </div>
      </div>

      <div ref={planeRef} className={["ph-plane", hasSelection ? "has-selection" : ""].join(" ")}>
        <div
          className="ph-plane-canvas"
          style={{
            gridTemplateColumns: `repeat(${COLS}, minmax(180px, 1fr))`,
            gridTemplateRows: `repeat(${rows}, 148px)`,
          }}
        >
          {nodes.map((n) => {
            const nodeAbsences = absencesByNodeId.mapped.get(n.id) ?? [];
            const isFocusedCell = nodeAbsences.some((a) => a.id === selectedAbsenceId);

            return (
              <div
                key={n.id}
                id={`ph-node-${n.id}`}
                data-node-id={n.id}
                className={[
                  "ph-node-cell",
                  "ph-node-plate",
                  isFocusedCell ? "is-focused" : "",
                  hasSelection && !isFocusedCell ? "is-dimmed" : "",
                ].join(" ")}
              >
                <div className="ph-node-cell-header">
                  <div className="ph-node-name" title={n.name}>
                    {n.name}
                  </div>
                  <div className="ph-node-code ph-mono" title={n.node_code}>
                    {n.node_code}
                  </div>
                </div>

                <div className="ph-node-holes ph-node-holes-plane">
                  {nodeAbsences.length === 0 ? (
                    <div className="ph-node-empty">—</div>
                  ) : (
                    nodeAbsences.slice(0, 4).map((a, idx) => {
                      const sev = sevBucket(a.severity);
                      const size = sizeBucket(sev);
                      const isSelected = selectedAbsenceId === a.id;
                      const isHighlighted = highlightSet.has(a.id) && !isSelected;
                      const depthCls = horizonDepthClass(a.horizon);

                      const offsetCls = `ph-hole-pos-${idx}`;

                      const cls = [
                        "ph-hole-v2",
                        `sev-${sev}`,
                        `size-${size}`,
                        depthCls,
                        offsetCls,
                        isSelected ? "is-selected" : "",
                        isHighlighted ? "is-highlighted" : "",
                      ].join(" ");

                      return (
                        <button
                          key={a.id}
                          type="button"
                          className={cls}
                          onClick={() => onSelect(a.id)}
                          title={`${a.horizon} • ${a.absence_type} • ${a.absence_key}`}
                        >
                          <span className="ph-hole-rim" />
                          <span className="ph-hole-void" />
                          <span className="ph-hole-below" />
                        </button>
                      );
                    })
                  )}

                  {nodeAbsences.length > 4 ? (
                    <div className="ph-node-more ph-mono">+{nodeAbsences.length - 4}</div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {lineageSet.size > 0 ? (
          <div className="ph-lineage-overlay" aria-hidden="true">
            <svg className="ph-lineage-svg" />
          </div>
        ) : null}

        <div className="ph-plane-vignette" aria-hidden="true" />
      </div>

      {absencesByNodeId.unmapped.length > 0 ? (
        <div className="ph-unmapped">
          <div className="ph-panel-title">Unmapped Absences</div>
          <div className="ph-muted">
            These emissions did not include a capability_node_id in details. They remain selectable but cannot be placed in the plane.
          </div>

          <div className="ph-void-token-grid">
            {absencesByNodeId.unmapped.slice(0, 10).map((a) => {
              const sev = sevBucket(a.severity);
              const size = sizeBucket(sev);
              const active = a.id === selectedAbsenceId;
              const depthCls = horizonDepthClass(a.horizon);

              return (
                <button
                  key={a.id}
                  type="button"
                  className={[
                    "ph-void-token",
                    `sev-${sev}`,
                    `size-${size}`,
                    depthCls,
                    active ? "is-selected" : "",
                  ].join(" ")}
                  onClick={() => onSelect(a.id)}
                  title={`${a.horizon} • ${a.absence_type} • ${a.absence_key}`}
                >
                  <span className="ph-hole-rim" />
                  <span className="ph-hole-void" />
                  <span className="ph-hole-below" />
                  <span className="ph-void-token-label">
                    <span className="ph-pill">{a.horizon}</span>
                    <span className="ph-void-token-type">{a.absence_type}</span>
                    <span className="ph-void-token-key ph-mono">{a.absence_key}</span>
                  </span>
                </button>
              );
            })}
            {absencesByNodeId.unmapped.length > 10 ? (
              <div className="ph-muted">+{absencesByNodeId.unmapped.length - 10} more…</div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
