// FILE: app/ui/program-health/CapabilityDriftMap.tsx

"use client";

// PH_HOLES_DEBUG: temporary forced visibility overlay

import * as React from "react";
import type {
  Horizon,
  ProgramHealthAbsence,
  ProgramHealthCapabilityNode,
  ProgramHealthSnapshot,
} from "./types";
import { HorizonGlyphRail } from "./HorizonGlyphRail";

function normalizeSeverityToken(sev: unknown): string {
  if (sev == null) return "";
  if (typeof sev === "string") return sev;
  if (typeof sev === "number") return String(sev);
  if (typeof sev === "object") {
    const anySev = sev as any;
    if (typeof anySev.severity === "string") return anySev.severity;
    if (typeof anySev.severity === "number") return String(anySev.severity);
    if (typeof anySev.value === "string") return anySev.value;
    if (typeof anySev.value === "number") return String(anySev.value);
  }
  return String(sev);
}

type Props = {
  capabilityNodes: ProgramHealthCapabilityNode[];
  absences: ProgramHealthAbsence[];
  snapshot: ProgramHealthSnapshot | null;
  selectedHorizon: Horizon;
  onSelectHorizon: (h: Horizon) => void;
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

type DriftAbsence = {
  absence_type: string;
  capability_node_id: string;
  sector_key: string | null;
  id?: string;
  absence_key?: string;
  severity?: string | null;
  horizon?: string | null;
};

type DriftNode = {
  id: string;
  node_code: string;
  sector_key: string | null;
  ui_slot: number | null;
};

type DriftCard = {
  capability_node_id: string;
  sector_key: string | null;
  ui_slot: number | null;
  node_code: string;
  absences: DriftAbsence[];
  severity: number;
};

type AbsenceLevel = "critical" | "high" | "medium" | "low";
type AbsenceLevelInput = AbsenceLevel | "unknown" | null | undefined;

function normalizeLevel(level: AbsenceLevelInput): AbsenceLevel {
  if (level === "critical" || level === "high" || level === "medium" || level === "low") return level;
  return "low";
}

const SECTORS = [
  { key: "structure", label: "STRUCTURE" },
  { key: "readiness", label: "READINESS" },
  { key: "capacity", label: "CAPACITY" },
  { key: "recovery", label: "RECOVERY" },
  { key: "execution", label: "EXECUTION" },
  { key: "resilience", label: "RESILIENCE" },
] as const;

const SLICE_COUNT = 6;
const SLICE_DEG = 360 / SLICE_COUNT;
const READ_LINE_DEG = -55;
const READ_MATH_OFFSET_DEG = -20;
const DISC_RADIUS_PX = 440;

function polarTransform(localDeg: number, radiusPx: number) {
  // Canonical placement contract for all on-disc elements:
  // 1) anchor at disc center via left/top 50%
  // 2) translate element origin to center (-50%,-50%)
  // 3) rotate to angle, translate outward, rotate back to keep upright
  return `translate(-50%, -50%) rotate(${localDeg}deg) translateX(${radiusPx}px) rotate(-${localDeg}deg)`;
}

const SECTOR_SUMMARY: Record<string, string> = {
  STRUCTURE:
    "Structural signals map the stability of the underlying system surface. Changes here indicate foundational shifts rather than transient fluctuations.",
  READINESS:
    "Readiness captures the system's immediate ability to respond under current conditions. The slice reflects posture and near-term activation state.",
  CAPACITY:
    "Capacity represents the available headroom across core resources. It tracks how much load the system can absorb without degradation.",
  RECOVERY:
    "Recovery summarizes how the system regains equilibrium after disturbances. It reflects return-to-baseline characteristics rather than momentary strain.",
  EXECUTION:
    "Execution tracks throughput and delivery coherence across the operational layer. It highlights how reliably the system is converting intent into action.",
  RESILIENCE:
    "Resilience reflects tolerance to stress and the ability to sustain function under pressure. The slice signals durability across adverse conditions.",
};

function normalizeDeg(d: number): number {
  return ((d % 360) + 360) % 360;
}

function sliceIndexUnderReadLine(rotationDeg: number): number {
  // NOTE: The visible read line stays at READ_LINE_DEG.
  // This offset rotates ONLY the math reference ray so the active slice flips on boundary crossing (axis lines).
  const worldAngle = normalizeDeg((READ_LINE_DEG + READ_MATH_OFFSET_DEG) - rotationDeg);
  const idx = Math.floor(worldAngle / SLICE_DEG) % SLICE_COUNT;
  return (idx + SLICE_COUNT) % SLICE_COUNT;
}

function buildDriftCards(opts: { absences: DriftAbsence[]; nodesById: Map<string, DriftNode> }) {
  const { absences, nodesById } = opts;
  const byNode = new Map<string, DriftCard>();

  for (const a of absences) {
    const node = nodesById.get(a.capability_node_id);
    if (!node) continue;

    let card = byNode.get(a.capability_node_id);
    if (!card) {
      card = {
        capability_node_id: a.capability_node_id,
        sector_key: node.sector_key ?? a.sector_key ?? null,
        ui_slot: node.ui_slot ?? null,
        node_code: node.node_code,
        absences: [],
        severity: 0,
      };
      byNode.set(a.capability_node_id, card);
    }

    card.absences.push(a);
    card.severity += 1;
  }

  return Array.from(byNode.values()).sort((x, y) => {
    const sx = x.sector_key ?? "";
    const sy = y.sector_key ?? "";
    if (sx !== sy) return sx.localeCompare(sy);

    const ux = x.ui_slot ?? Number.POSITIVE_INFINITY;
    const uy = y.ui_slot ?? Number.POSITIVE_INFINITY;
    if (ux !== uy) return ux - uy;

    return x.node_code.localeCompare(y.node_code);
  });
}

function sevBucket(severity: string | null | undefined): "critical" | "high" | "medium" | "low" | "unknown" {
  const s = normalizeSeverityToken(severity).toLowerCase();
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

function RadialPlaneScaffold(props: { hoverHorizon: Horizon | null; activeSliceIdx: number }) {
  const center = 500;
  const outerRadius = DISC_RADIUS_PX;
  const ringRadii = [140, 240, 340, 440];
  const ringLabels = ["H0", "H1", "H2", "H3"];

  const hoverBand = React.useMemo(() => {
    const h = props.hoverHorizon;
    if (!h) return null;

    const band =
      h === "H0"
        ? { r: 70, w: 140 }
        : h === "H1"
        ? { r: 190, w: 100 }
        : h === "H2"
        ? { r: 290, w: 100 }
        : { r: 390, w: 100 };

    return (
      <circle
        cx={500}
        cy={500}
        r={band.r}
        fill="none"
        stroke="rgba(255,255,255,0.10)"
        strokeWidth={band.w}
        pointerEvents="none"
      />
    );
  }, [props.hoverHorizon]);

  return (
    <svg
      className="block h-full w-full"
      viewBox="0 0 1000 1000"
      preserveAspectRatio="xMidYMid meet"
      style={{ pointerEvents: "none" }}
    >
      <defs>
        {(() => {
          const center = 500;
          const outerRadius = 440;
          const r = outerRadius - 6;
          const wedge = 60;
          const arcSpan = 44;

          const makeArc = (i: number) => {
            const mid = i * wedge + wedge / 2 + 30;
            const a0 = (mid - arcSpan / 2) * (Math.PI / 180);
            const a1 = (mid + arcSpan / 2) * (Math.PI / 180);

            const round = (n: number) => Math.round(n * 1000) / 1000;

            const x0 = round(center + r * Math.cos(a0));
            const y0 = round(center + r * Math.sin(a0));
            const x1 = round(center + r * Math.cos(a1));
            const y1 = round(center + r * Math.sin(a1));

            const d = `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`;
            return { id: `ph-perim-arc-${i}`, d };
          };

          return Array.from({ length: 6 }, (_, i) => {
            const a = makeArc(i);
            return <path key={a.id} id={a.id} d={a.d} />;
          });
        })()}
        <radialGradient id="phRadialGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(120,200,255,0.18)" />
          <stop offset="55%" stopColor="rgba(120,200,255,0.06)" />
          <stop offset="100%" stopColor="rgba(120,200,255,0.0)" />
        </radialGradient>
        <radialGradient id="phActiveSectorWash" cx="50%" cy="50%" r="72%">
          <stop offset="0%" stopColor="color-mix(in oklab, transparent 78%, var(--brand) 22%)" />
          <stop offset="55%" stopColor="color-mix(in oklab, transparent 84%, var(--brand) 16%)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>

      {hoverBand}
      <circle cx={center} cy={center} r={outerRadius} fill="url(#phRadialGlow)" />
      {(() => {
        const idx = ((props.activeSliceIdx % SLICE_COUNT) + SLICE_COUNT) % SLICE_COUNT;
        const startDeg = idx * SLICE_DEG + 30;
        const endDeg = startDeg + SLICE_DEG;

        const a0 = (startDeg * Math.PI) / 180;
        const a1 = (endDeg * Math.PI) / 180;

        const round = (n: number) => Math.round(n * 1000) / 1000;

        const x0 = round(center + outerRadius * Math.cos(a0));
        const y0 = round(center + outerRadius * Math.sin(a0));
        const x1 = round(center + outerRadius * Math.cos(a1));
        const y1 = round(center + outerRadius * Math.sin(a1));

        const d = `M ${center} ${center} L ${x0} ${y0} A ${outerRadius} ${outerRadius} 0 0 1 ${x1} ${y1} Z`;

        return (
          <path
            key={`ph-active-sector-wash-${idx}`}
            d={d}
            className="ph-active-sector-wash ph-ray-enter"
            fill="url(#phActiveSectorWash)"
            pointerEvents="none"
          />
        );
      })()}

      <g>
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

        {/* Canonical tri-axes (0°, 60°, 120°) -> 6 equal wedges */}
        {[0, 60, 120].map((deg) => (
          <line
            key={`axis-${deg}`}
            x1={center}
            y1={center - outerRadius}
            x2={center}
            y2={center + outerRadius}
            transform={`rotate(${deg} ${center} ${center})`}
            stroke="rgba(255,255,255,0.22)"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {(() => {
          const labels = ["Structure", "Readiness", "Capacity", "Recovery", "Execution", "Resilience"];
          return labels.map((label, i) => (
            <text
              key={`perim-${label}`}
              fontSize={20}
              letterSpacing={2}
              fill="rgba(255,255,255,0.48)"
              style={{ userSelect: "none" }}
            >
              <textPath
                href={`#ph-perim-arc-${i}`}
                xlinkHref={`#ph-perim-arc-${i}`}
                startOffset="50%"
                textAnchor="middle"
                dominantBaseline="middle"
                method="align"
                spacing="auto"
              >
                {label.toUpperCase()}
              </textPath>
            </text>
          ));
        })()}
      </g>

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
    </svg>
  );
}

export function CapabilityDriftMap({
  capabilityNodes,
  absences,
  snapshot: _snapshot,
  selectedHorizon,
  onSelectHorizon,
  selectedAbsenceId,
  onSelect,
  highlightAbsenceIds,
  lineageNodeIds,
  showUnmapped = true,
  onAbsenceHover,
  onAbsenceSelect,
}: Props) {
  const highlightSet = React.useMemo(() => new Set(highlightAbsenceIds ?? []), [highlightAbsenceIds]);
  const lineageSet = React.useMemo(() => new Set(lineageNodeIds ?? []), [lineageNodeIds]);
  const [selectedCapabilityNodeId, setSelectedCapabilityNodeId] = React.useState<string | null>(null);
  const [hoveredCapabilityNodeId, setHoveredCapabilityNodeId] = React.useState<string | null>(null);
  const [hoverHorizon, setHoverHorizon] = React.useState<Horizon | null>(null);

  const activeCapabilityNodeId = hoveredCapabilityNodeId ?? selectedCapabilityNodeId;

  const nodes = React.useMemo(() => {
    return [...capabilityNodes].sort((a, b) => {
      const ac = (a.node_code ?? "").localeCompare(b.node_code ?? "");
      if (ac !== 0) return ac;
      const nc = (a.name ?? "").localeCompare(b.name ?? "");
      if (nc !== 0) return nc;
      return String(a.id).localeCompare(String(b.id));
    });
  }, [capabilityNodes]);

  const nodesById = React.useMemo(() => {
    const m = new Map<string, ProgramHealthCapabilityNode>();
    nodes.forEach((n) => m.set(n.id, n));
    return m;
  }, [nodes]);

  const driftNodesById = React.useMemo(() => {
    const m = new Map<string, DriftNode>();
    nodes.forEach((n) => {
      m.set(n.id, {
        id: n.id,
        node_code: n.node_code,
        sector_key: n.sector_key ?? null,
        ui_slot: n.ui_slot ?? null,
      });
    });
    return m;
  }, [nodes]);

  const snapshotAbsences = React.useMemo<DriftAbsence[]>(() => {
    const raw = (_snapshot as any)?.full_payload?.absences;
    if (!Array.isArray(raw)) return [];
    return raw.filter((a: any) => {
      const h = (a?.horizon ?? "").toString().toUpperCase();
      const effectiveHorizon = (hoverHorizon ?? selectedHorizon).toString().toUpperCase();
      return h === effectiveHorizon;
    });
  }, [_snapshot, hoverHorizon, selectedHorizon]);

  const driftCards = React.useMemo(() => {
    return buildDriftCards({ absences: snapshotAbsences, nodesById: driftNodesById });
  }, [snapshotAbsences, driftNodesById]);

  type SectorKey = (typeof SECTORS)[number]["key"];

  const cardsBySector = React.useMemo(() => {
    const valid = new Set<SectorKey>(SECTORS.map((s) => s.key as SectorKey));
    const map = new Map<SectorKey, DriftCard[]>();
    for (const card of driftCards) {
      const keyRaw = (card.sector_key ?? "").toString().trim().toLowerCase();
      if (!keyRaw) continue;
      if (!valid.has(keyRaw as SectorKey)) continue;
      const key = keyRaw as SectorKey;
      const arr = map.get(key) ?? [];
      arr.push(card);
      map.set(key, arr);
    }
    return map;
  }, [driftCards]);

  const driftCardIds = React.useMemo(() => {
    return new Set(driftCards.map((c) => c.capability_node_id));
  }, [driftCards]);

  React.useEffect(() => {
    if (selectedCapabilityNodeId && !driftCardIds.has(selectedCapabilityNodeId)) {
      setSelectedCapabilityNodeId(null);
    }
    if (hoveredCapabilityNodeId && !driftCardIds.has(hoveredCapabilityNodeId)) {
      setHoveredCapabilityNodeId(null);
    }
  }, [driftCardIds, selectedCapabilityNodeId, hoveredCapabilityNodeId]);

  const absencesByNodeId = React.useMemo(() => {
    const m = new Map<string, DriftAbsence[]>();
    const unmapped: DriftAbsence[] = [];

    for (const a of snapshotAbsences) {
      if (a.capability_node_id && driftNodesById.has(a.capability_node_id)) {
        const arr = m.get(a.capability_node_id) ?? [];
        arr.push(a);
        m.set(a.capability_node_id, arr);
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
  }, [snapshotAbsences, driftNodesById]);

  const hasSelection = Boolean(selectedAbsenceId);
  const planeRef = React.useRef<HTMLDivElement | null>(null);
  const discStageRef = React.useRef<HTMLDivElement | null>(null);

  const [discSpinDeg, setDiscSpinDeg] = React.useState(0);
  const [horizonPanelOpen, setHorizonPanelOpen] = React.useState(false);
  const [panelHorizon, setPanelHorizon] = React.useState<Horizon>("H0");
  const dragActiveRef = React.useRef(false);
  const dragStartClientRef = React.useRef<{ x: number; y: number } | null>(null);
  const dragStartSpinRef = React.useRef<number>(0);
  const dragStartAngleRef = React.useRef<number>(0);
  const dragPointerIdRef = React.useRef<number | null>(null);
  const suppressNextClickRef = React.useRef(false);
  const DRAG_THRESHOLD_PX = 6;

  function angleDegFromClient(px: number, py: number) {
    const el = discStageRef.current!;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const a = (Math.atan2(py - cy, px - cx) * 180) / Math.PI;
    return normalizeDeg(a);
  }

  function shortestDelta(current: number, start: number) {
    return ((current - start + 540) % 360) - 180;
  }

  function ignoreTarget(t: EventTarget | null) {
    if (!(t instanceof Element)) return false;
    return Boolean(t.closest(".ph-dock-top,.ph-dock-left,.ph-dock-right,.ph-dock-inspector,.ph-horizon-rail-bottom"));
  }

  const onDiscPointerDownCapture = (evt: React.PointerEvent<HTMLDivElement>) => {
    if (ignoreTarget(evt.target)) return;
    dragPointerIdRef.current = evt.pointerId;
    dragActiveRef.current = false;
    suppressNextClickRef.current = false;
    dragStartClientRef.current = { x: evt.clientX, y: evt.clientY };
    dragStartSpinRef.current = discSpinDeg;
    dragStartAngleRef.current = angleDegFromClient(evt.clientX, evt.clientY);
  };

  const onDiscPointerMoveCapture = (evt: React.PointerEvent<HTMLDivElement>) => {
    if (dragPointerIdRef.current !== evt.pointerId) return false;
    const start = dragStartClientRef.current;
    if (!start) return false;
    const moved = Math.hypot(evt.clientX - start.x, evt.clientY - start.y);
    if (!dragActiveRef.current) {
      if (moved < DRAG_THRESHOLD_PX) return false;
      dragActiveRef.current = true;
      suppressNextClickRef.current = true;
      evt.currentTarget.setPointerCapture(evt.pointerId);
    }
    const currentAngle = angleDegFromClient(evt.clientX, evt.clientY);
    const d = shortestDelta(currentAngle, dragStartAngleRef.current);
    setDiscSpinDeg(normalizeDeg(dragStartSpinRef.current + d));
    evt.preventDefault();
    evt.stopPropagation();
    return true;
  };

  const onDiscPointerUpCapture = (evt: React.PointerEvent<HTMLDivElement>) => {
    if (dragPointerIdRef.current !== evt.pointerId) return;
    if (dragActiveRef.current) {
      evt.preventDefault();
      evt.stopPropagation();
    }
    dragPointerIdRef.current = null;
    dragStartClientRef.current = null;
    dragActiveRef.current = false;
  };

  const isPinnedByClick = hoverHorizon == null;

  const handleHorizonHover = React.useCallback((h: Horizon | null) => {
    setHoverHorizon(h);
  }, []);

  const handleHorizonClick = React.useCallback(
    (h: Horizon) => {
      onSelectHorizon(h);
      setPanelHorizon(h);
      setHorizonPanelOpen((prev) => {
        if (prev && panelHorizon === h) return false;
        return true;
      });
    },
    [onSelectHorizon, panelHorizon]
  );

  const computeHorizonFromDisc = React.useCallback(
    (evt: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>): Horizon | null => {
      const el = discStageRef.current;
      if (!el) return null;

      const rect = el.getBoundingClientRect();

      // Convert to 0..1000 "viewBox-like" coordinates, matching RadialPlaneScaffold math.
      const px = ((evt.clientX - rect.left) / rect.width) * 1000;
      const py = ((evt.clientY - rect.top) / rect.height) * 1000;

      const dx = px - 500;
      const dy = py - 500;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= 140) return "H0";
      if (dist <= 240) return "H1";
      if (dist <= 340) return "H2";
      if (dist <= 440) return "H3";
      return null;
    },
    []
  );

  const lastHoverRef = React.useRef<Horizon | null>(null);

  React.useEffect(() => {
    const el = planeRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY;
      setDiscSpinDeg((prev) => {
        const next = prev + delta * 0.08;
        return ((next % 360) + 360) % 360;
      });
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel as EventListener);
  }, []);

  React.useLayoutEffect(() => {
    const plane = planeRef.current;
    if (!plane) return;

    const svg = plane.querySelector<SVGSVGElement>(".ph-lineage-svg");
    if (!svg) return;

    const draw = () => {
      while (svg.firstChild) svg.removeChild(svg.firstChild);

      if (lineageSet.size < 2) return;

      const planeRect = plane.getBoundingClientRect();
      const plates = Array.from(plane.querySelectorAll<HTMLElement>("[data-node-id]")).filter((el) => {
        const id = el.dataset.nodeId ?? "";
        return lineageSet.has(id);
      });

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
      </div>

      <div className="ph-map-root">
        <div ref={planeRef} className="ph-map-plane">
          <div className="ph-radial-viewport">
            <div
              ref={discStageRef}
              className="ph-disc-stage"
              onPointerDownCapture={onDiscPointerDownCapture}
              onPointerMoveCapture={(evt) => {
                const dragging = onDiscPointerMoveCapture(evt);
                if (dragging) return;
                const h = computeHorizonFromDisc(evt);
                if (lastHoverRef.current !== h) {
                  lastHoverRef.current = h;
                  handleHorizonHover(h);
                }
              }}
              onPointerUpCapture={onDiscPointerUpCapture}
              onPointerCancelCapture={onDiscPointerUpCapture}
              onPointerLeave={() => {
                if (dragActiveRef.current) return;
                lastHoverRef.current = null;
                handleHorizonHover(null);
              }}
              onClickCapture={(evt) => {
                if (suppressNextClickRef.current) {
                  suppressNextClickRef.current = false;
                  evt.preventDefault();
                  evt.stopPropagation();
                  return;
                }
                const h = computeHorizonFromDisc(evt);
                if (h) handleHorizonClick(h);
              }}
              style={{ cursor: hoverHorizon ? "pointer" : "default" }}
            >
              {/*<div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: `${DISC_RADIUS_PX}px`,
                  height: "1px",
                  background: "rgba(255,255,255,0.28)",
                  transformOrigin: "0 50%",
                  transform: `rotate(${READ_LINE_DEG}deg) translateX(0)`,
                  pointerEvents: "none",
                }}
              />*/}
              <div
                className="ph-disc-tilt"
                style={
                  {
                    ["--ph-disc-spin" as any]: `${discSpinDeg}deg`,
                  } as React.CSSProperties
                }
              >
                                <div className="ph-disc-sidewall" aria-hidden />
                <div className="ph-disc-sidewallCore" aria-hidden />
                <div className="ph-disc-saucer" aria-hidden />
{(() => {
                  const activeIdx = sliceIndexUnderReadLine(discSpinDeg);
                  return <RadialPlaneScaffold hoverHorizon={hoverHorizon} activeSliceIdx={activeIdx} />;
                })()}

                <div className="ph-radial-layer absolute inset-0">
                  {SECTORS.map((sector, sectorIndex) => {
                    const angleStart = (sectorIndex * 360) / SECTORS.length;
                    const sectorCards = cardsBySector.get(sector.key) ?? [];
                    const sectorCount = Math.max(1, sectorCards.length);
                    const sectorAbsencesAll = snapshotAbsences.filter((a) => {
                      const k = (a.sector_key ?? "").toString().trim().toLowerCase();
                      return k === sector.key;
                    });
                    // Canonical truth list for this sector: snapshot payload filtered to active horizon.
                    const sectorAbsences = sectorAbsencesAll;

                    return (
                      <div key={sector.key} className="absolute inset-0" style={{ transform: `rotate(${angleStart}deg)` }}>
                        {sectorCards.length > 0 && (
                          <div className="ph-disc-hole-layer absolute inset-0" aria-hidden>
                            {(() => {
                              const spanDeg = 360 / SECTORS.length;
                              const radiusPx = 420;
                              return sectorCards.map((card, idx) => {
                                const t = (idx + 0.5) / sectorCount;
                                const localDeg = -spanDeg / 2 + t * spanDeg;
                                const holeKey = `${sector.key}:${card.capability_node_id}:${card.ui_slot ?? "na"}:${idx}`;
                                const isActive = activeCapabilityNodeId === card.capability_node_id;
                                return (
                                  <div
                                    key={holeKey}
                                    className={["ph-disc-hole-dot", isActive ? "is-active" : ""].join(" ")}
                                    style={{
                                      position: "absolute",
                                      left: "50%",
                                      top: "50%",
                                      transform: polarTransform(localDeg, radiusPx),
                                    }}
                                    title={card.node_code}
                                    onPointerEnter={() => setHoveredCapabilityNodeId(card.capability_node_id)}
                                    onPointerLeave={() => setHoveredCapabilityNodeId(null)}
                                    onClick={(evt) => {
                                      evt.stopPropagation();
                                      setSelectedCapabilityNodeId((prev) =>
                                        prev === card.capability_node_id ? null : card.capability_node_id
                                      );
                                    }}
                                  />
                                );
                              });
                            })()}
                          </div>
                        )}
                        {sectorCards.map((card, idx) => {
                          const n = nodesById.get(card.capability_node_id);
                          if (!n) return null;

                          // Plates must be backed by snapshot payload (disc truth), not prop absences (can drift).
                          // Plates use the same horizon-filtered payload list as the disc dots (1:1 truth).
                          const nodeAbsences = sectorAbsences.filter((a: any) => {
                            const id = (a?.capability_node_id ?? a?.capabilityNodeId) as string | undefined;
                            return id === n.id;
                          });
                          const isFocusedCell = nodeAbsences.some((a) => a.id === selectedAbsenceId);
                          const isActive = activeCapabilityNodeId === card.capability_node_id;
                          // Anchor node plates to the same deterministic sloting model as disc holes.
                          // Parent wrapper already applies `rotate(angleStart)`; child must use LOCAL sector angle only.
                          const spanDeg = 360 / SECTORS.length;
                          const maxSlots = 12;
                          const rawSlot = Number.isFinite(Number(card.ui_slot)) ? Number(card.ui_slot) : idx;
                          const slot = ((Math.floor(rawSlot) % maxSlots) + maxSlots) % maxSlots;
                          const t = (slot + 0.5) / maxSlots;
                          const localDeg = -spanDeg / 2 + t * spanDeg;
                          const stack = Math.floor(idx / maxSlots);
                          // Canonical plate radius: keep inside the disc while remaining legible.
                          const r = 260 + stack * 56;

                          return (
                            <div
                              key={card.capability_node_id}
                              id={`ph-node-${card.capability_node_id}`}
                              data-node-id={card.capability_node_id}
                              className={[
                                "ph-node-cell",
                                "ph-node-plate",
                                "ph-node-radial",
                                isFocusedCell ? "is-focused" : "",
                                hasSelection && !isFocusedCell ? "is-dimmed" : "",
                                isActive ? "is-active" : "",
                              ].join(" ")}
                              style={{
                                position: "absolute",
                                left: "50%",
                                top: "50%",
                                transform: polarTransform(localDeg, r),
                              }}
                              onMouseEnter={() => setHoveredCapabilityNodeId(card.capability_node_id)}
                              onMouseLeave={() => setHoveredCapabilityNodeId(null)}
                              onClick={(evt) => {
                                evt.stopPropagation();
                                setSelectedCapabilityNodeId(card.capability_node_id);
                              }}
                            >
                              <div className="ph-node-cell-header">
                                <div className="ph-node-name" title={n.name}>
                                  {n.name}
                                </div>
                                <div className="ph-node-code ph-mono" title={n.node_code}>
                                  {n.node_code}
                                </div>
                              </div>

                              {nodeAbsences.length > 0 ? (
                                <div
                                  className="ph-mono"
                                  style={{
                                    position: "absolute",
                                    right: "10px",
                                    top: "10px",
                                    fontSize: "11px",
                                    padding: "2px 8px",
                                    borderRadius: "999px",
                                    background: "rgba(255,0,0,0.65)",
                                    border: "1px solid rgba(255,255,255,0.35)",
                                    color: "white",
                                    zIndex: 50,
                                    pointerEvents: "none",
                                  }}
                                >
                                  HOLES:{nodeAbsences.length}
                                </div>
                              ) : null}
                              <div className="ph-node-holes ph-node-holes-plane">
                                {nodeAbsences.slice(0, 4).map((a, holeIdx) => {
                                  const sev = sevBucket(a.severity);
                                  const size = sizeBucket(sev);
                                  const lvl = normalizeLevel(sev);
                                  const absenceId: string | null =
                                    (a?.id ?? a?.absence_key ?? null) as string | null;
                                  const isSelected = absenceId != null && selectedAbsenceId === absenceId;
                                  const isHighlighted = absenceId != null && highlightSet.has(absenceId) && !isSelected;
                                  const depthCls = horizonDepthClass(a.horizon);

                                  const offsetCls = `ph-hole-pos-${holeIdx}`;

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
                                    if (!absenceId) return;
                                    if (onAbsenceSelect) {
                                      onAbsenceSelect(absenceId);
                                      return;
                                    }
                                    onSelect(absenceId);
                                  };

                                  return (
                                    <button
                                      key={
                                        a.id ??
                                        a.absence_key ??
                                        `${n.id}:${a.absence_type ?? "absence"}:${holeIdx}`
                                      }
                                      type="button"
                                      className={cls}
                                      style={{
                                        outline: "2px solid rgba(255,0,0,0.9)",
                                        background: "rgba(255,0,0,0.18)",
                                        pointerEvents: "auto",
                                        zIndex: 60,
                                      }}
                                      onClick={handleSelect}
                                      onMouseEnter={() => {
                                        if (!onAbsenceHover) return;
                                        onAbsenceHover(absenceId, {
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
                                })}

                                {nodeAbsences.length > 4 ? (
                                  <div className="ph-node-more ph-mono">+{nodeAbsences.length - 4}</div>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="ph-map-overlay">
              <div
                className="ph-glass"
                style={{
                  position: "absolute",
                  top: "12px",
                  left: "12px",
                  padding: "8px 10px",
                  borderRadius: "12px",
                  fontSize: "12px",
                  color: "rgba(255,255,255,0.80)",
                  background: "rgba(0,0,0,0.44)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  pointerEvents: "none",
                  zIndex: 20,
                }}
              >
                <div className="ph-mono" style={{ opacity: 0.85 }}>
                  nodes: {nodes.length} • absences: {absences.length}
                </div>
                <div className="ph-mono" style={{ opacity: 0.65, marginTop: "4px" }}>
                  mapped: {absencesByNodeId.mapped.size} • unmapped: {absencesByNodeId.unmapped.length}
                </div>
              </div>
              <div className="ph-stamp">R3.0 RADIAL COORDINATE SYSTEM LIVE</div>
              <div className="ph-legend">
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

            {(() => {
              const rotationDeg = discSpinDeg;
              const activeIdx = sliceIndexUnderReadLine(rotationDeg);
              const activeSector = SECTORS[activeIdx];
              const summary = SECTOR_SUMMARY[activeSector.label] ?? "";
              const readLineRad = (READ_LINE_DEG * Math.PI) / 180;
              const tipX = Math.cos(readLineRad) * DISC_RADIUS_PX;
              const tipY = Math.sin(readLineRad) * DISC_RADIUS_PX;

              return (
                <div
                  style={{
                    position: "absolute",
                    left: `calc(50% + ${tipX + 200}px)`,
                    top: `calc(50% + ${tipY + 120}px)`,
                    transform: "translate(-100%, -100%)",
                    width: "280px",
                    pointerEvents: "auto",
                    background: "rgba(0,0,0,0.52)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "14px",
                    padding: "12px",
                    color: "rgba(255,255,255,0.86)",
                    zIndex: 6,
                  }}
                >
                  <div style={{ fontSize: "12px", letterSpacing: "0.18em", textTransform: "uppercase" }}>
                    {activeSector.label}
                  </div>
                  <div style={{ marginTop: "8px", fontSize: "12px", lineHeight: 1.5 }}>
                    {summary}
                  </div>
                </div>
              );
            })()}

            <div
              className="ph-horizon-rail-bottom"
              style={{
                position: "absolute",
                left: "50%",
                bottom: "143px",
                transform: "translateX(-50%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px",
                pointerEvents: "auto",
                zIndex: 7,
              }}
            >
              {horizonPanelOpen ? (
                <div
                  style={{
                    width: "820px",
                    maxWidth: "calc(100vw - 48px)",
                    background: "rgba(0,0,0,0.52)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "16px",
                    padding: "14px",
                    color: "rgba(255,255,255,0.86)",
                    boxShadow: "0 16px 60px rgba(0,0,0,0.45)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                    <div
                      style={{
                        fontSize: "12px",
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        color: "rgba(255,255,255,0.65)",
                      }}
                    >
                      Horizon Analysis
                    </div>
                    <button
                      type="button"
                      onClick={() => setHorizonPanelOpen(false)}
                      style={{
                        fontSize: "12px",
                        color: "rgba(255,255,255,0.70)",
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: "999px",
                        padding: "6px 10px",
                      }}
                    >
                      Close
                    </button>
                  </div>

                  <div style={{ marginTop: "10px", fontSize: "13px", lineHeight: 1.5, color: "rgba(255,255,255,0.78)" }}>
                    <div style={{ fontWeight: 700, color: "rgba(255,255,255,0.90)" }}>{panelHorizon} — (placeholder)</div>
                    <div style={{ marginTop: "6px" }}>
                      This panel is intentionally placeholder. R4 requires only physical layout + interaction surfaces.
                      Runtime truth wiring will be added after this rail is locked.
                    </div>
                  </div>
                </div>
              ) : null}

              <HorizonGlyphRail
                activeHorizon={hoverHorizon ?? selectedHorizon}
                pinnedHorizon={selectedHorizon}
                isPinnedByClick={isPinnedByClick}
              />
            </div>

            {lineageSet.size > 0 ? (
              <div className="ph-lineage-overlay z-30" aria-hidden="true">
                <svg className="ph-lineage-svg" />
              </div>
            ) : null}
          </div>
        </div>
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
              const absenceId: string | null = (a?.id ?? a?.absence_key ?? null) as string | null;
              const active = absenceId != null && absenceId === selectedAbsenceId;
              const depthCls = horizonDepthClass(a.horizon);

              return (
                <button
                  key={a.id ?? a.absence_key ?? `${a.absence_type ?? "absence"}:${a.capability_node_id ?? "unmapped"}`}
                  type="button"
                  className={["ph-void-token", `sev-${sev}`, `size-${size}`, depthCls, active ? "is-selected" : ""].join(" ")}
                  onClick={() => {
                    if (!absenceId) return;
                    if (onAbsenceSelect) {
                      onAbsenceSelect(absenceId);
                      return;
                    }
                    onSelect(absenceId);
                  }}
                  onMouseEnter={() => {
                    onAbsenceHover?.(absenceId, {
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
