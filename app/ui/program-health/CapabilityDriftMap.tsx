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
  showUnmapped?: boolean;
  onAbsenceHover?: (
    absenceId: string | null,
    summary: { capabilityLabel: string; level: "critical" | "high" | "medium" | "low" } | null
  ) => void;
  onAbsenceSelect?: (absenceId: string) => void;
};

type AbsenceLevel = "critical" | "high" | "medium" | "low";
type AbsenceLevelInput = AbsenceLevel | "unknown" | null | undefined;

function normalizeLevel(level: AbsenceLevelInput): AbsenceLevel {
  if (level === "critical" || level === "high" || level === "medium" || level === "low") return level;
  return "low";
}

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

function RadialPlaneScaffold() {
  const center = 500;
  const outerRadius = 440;
  const ringRadii = [140, 240, 340, 440];
  const ringLabels = ["H0", "H1", "H2", "H3"];
  const sectorLabels = ["STRUCTURE", "READINESS", "CAPACITY", "RECOVERY"];
  const sectorAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];

  return (
    <svg className="h-full w-full" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="phRadialGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(120,200,255,0.18)" />
          <stop offset="55%" stopColor="rgba(120,200,255,0.06)" />
          <stop offset="100%" stopColor="rgba(120,200,255,0.0)" />
        </radialGradient>
      </defs>

      <circle cx={center} cy={center} r={outerRadius} fill="url(#phRadialGlow)" />
      <circle
        cx={center}
        cy={center}
        r={outerRadius}
        fill="none"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="2"
      />

      {ringRadii.map((r) => (
        <circle
          key={`ring-${r}`}
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.10)"
          strokeWidth="2"
        />
      ))}

      {sectorAngles.map((angle, i) => {
        const x2 = center + outerRadius * Math.cos(angle);
        const y2 = center + outerRadius * Math.sin(angle);
        return (
          <line
            key={`spoke-${i}`}
            x1={center}
            y1={center}
            x2={x2}
            y2={y2}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="2"
          />
        );
      })}

      <circle
        cx={center}
        cy={center}
        r={60}
        fill="rgba(255,255,255,0.06)"
        stroke="rgba(255,255,255,0.20)"
        strokeWidth="2"
      />
      <text
        x={center}
        y={center + 8}
        textAnchor="middle"
        fontSize="26"
        fill="rgba(255,255,255,0.70)"
        fontFamily="ui-sans-serif, system-ui"
      >
        NOW
      </text>

      {ringRadii.map((r, idx) => (
        <text
          key={`label-${ringLabels[idx]}`}
          x={center}
          y={center - r + 18}
          textAnchor="middle"
          fontSize="18"
          fill="rgba(255,255,255,0.30)"
        >
          {ringLabels[idx]}
        </text>
      ))}

      {sectorLabels.map((label, idx) => {
        const angle = (Math.PI / 4) + idx * (Math.PI / 2);
        const x = center + 400 * Math.cos(angle);
        const y = center + 400 * Math.sin(angle);
        return (
          <text
            key={`sector-${label}`}
            x={x}
            y={y}
            textAnchor="middle"
            alignmentBaseline="middle"
            fontSize="22"
            fill="rgba(255,255,255,0.22)"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}

export function CapabilityDriftMap({
  capabilityNodes,
  absences,
  selectedAbsenceId,
  onSelect,
  highlightAbsenceIds,
  lineageNodeIds,
  showUnmapped = true,
  onAbsenceHover,
  onAbsenceSelect,
}: Props) {
  return (
    <div className="ph-map-v1 ph-structural-truth relative h-full w-full overflow-hidden">
      <div className="absolute left-4 bottom-4 z-50 rounded-md border border-white/20 bg-black/60 px-3 py-2 text-xs font-semibold text-white/80">
        RADIAL R1 ACTIVE (CapabilityDriftMap.tsx)
      </div>
      <div className="absolute inset-0 z-0">
        <RadialPlaneScaffold />
      </div>
      <div className="relative z-10" />
    </div>
  );

  const highlightSet = React.useMemo(
    () => new Set(highlightAbsenceIds ?? []),
    [highlightAbsenceIds]
  );
  const lineageSet = React.useMemo(() => new Set(lineageNodeIds ?? []), [lineageNodeIds]);

  const nodes = React.useMemo(() => {
    return [...capabilityNodes].sort((a, b) => {
      const ac = (a.node_code ?? "").localeCompare(b.node_code ?? "");
      if (ac !== 0) return ac;
      const nc = (a.name ?? "").localeCompare(b.name ?? "");
      if (nc !== 0) return nc;
      return String(a.id).localeCompare(String(b.id));
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
    <div className="ph-map-v1 ph-structural-truth h-full w-full">
      <div className="ph-map-v1-header">
        <div>
          <div className="ph-panel-title">Capability Drift Map</div>
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

      <div
        ref={planeRef}
        className={["ph-plane", "ph-mat", hasSelection ? "has-selection" : ""].join(" ")}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
            backgroundSize: "180px 148px",
            opacity: 0.06,
          }}
        />
        <div className="pointer-events-none absolute left-3 top-2 text-[10px] uppercase tracking-[0.2em] text-white/20">
          Capability Axis
        </div>
        <div className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] uppercase tracking-[0.2em] text-white/20">
          Depth / Horizon
        </div>
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
                      const lvl = normalizeLevel(sev);
                      const isSelected = selectedAbsenceId === a.id;
                      const isHighlighted = highlightSet.has(a.id) && !isSelected;
                      const depthCls = horizonDepthClass(a.horizon);

                      const offsetCls = `ph-hole-pos-${idx}`;

                      const cls = [
                        "ph-hole",
                        "ph-hole-v2",
                        `sev-${sev}`,
                        `size-${size}`,
                        depthCls,
                        offsetCls,
                        isSelected ? "is-selected" : "",
                        isHighlighted ? "is-highlighted" : "",
                      ].join(" ");

                      const handleSelect = () => {
                        if (onAbsenceSelect) {
                          onAbsenceSelect(a.id);
                          return;
                        }
                        onSelect(a.id);
                      };

                      return (
                        <button
                          key={a.id}
                          type="button"
                          className={cls}
                          onClick={handleSelect}
                          onMouseEnter={() => {
                            if (!onAbsenceHover) return;
                            onAbsenceHover(a.id, {
                              capabilityLabel: n.name ?? n.node_code ?? "Unknown capability",
                              level: lvl,
                            });
                          }}
                          onMouseLeave={() => {
                            onAbsenceHover?.(null, null);
                          }}
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

      {showUnmapped && absencesByNodeId.unmapped.length > 0 ? (
        <div className="ph-unmapped">
          <div className="ph-panel-title">Unmapped Absences</div>
          <div className="ph-muted">
            These emissions did not include a capability_node_id in details. They remain selectable but cannot be placed in the plane.
          </div>

          <div className="ph-void-token-grid">
            {absencesByNodeId.unmapped.slice(0, 10).map((a) => {
              const sev = sevBucket(a.severity);
              const size = sizeBucket(sev);
              const lvl = normalizeLevel(sev);
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
                  onClick={() => {
                    if (onAbsenceSelect) {
                      onAbsenceSelect(a.id);
                      return;
                    }
                    onSelect(a.id);
                  }}
                  onMouseEnter={() => {
                    onAbsenceHover?.(a.id, {
                      capabilityLabel: "Unmapped",
                      level: lvl,
                    });
                  }}
                  onMouseLeave={() => onAbsenceHover?.(null, null)}
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
