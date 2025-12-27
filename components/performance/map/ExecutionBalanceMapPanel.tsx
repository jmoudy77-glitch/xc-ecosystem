"use client";
// components/performance/map/ExecutionBalanceMapPanel.tsx
import VerticalBalanceField from "./VerticalBalanceField";
import { useEffect, useMemo, useRef, useState } from "react";
import { updateStrain } from "../../../lib/performance/strainRegistry";
import type { DichotomyKey } from "../../../lib/performance/strainRegistry";
import { defaultStrainAccumulatorConfig } from "../../../lib/performance/strainAccumulator";
import {
  classifyEquilibriumState,
  type EquilibriumState,
} from "../../../lib/performance/equilibriumState";
import { useParams } from "next/navigation";
import { GlassModalShell } from "@/components/ui/GlassModalShell";
import BrainstormModal, { type BrainstormContext } from "@/app/programs/[programId]/brainstorm/BrainstormModal";

type Pair = {
  top: string;
  bottom: string;
};

const PAIRS: Pair[] = [
  { top: "Training Load", bottom: "Competitive Readiness" },
  { top: "Individual Development", bottom: "Team Performance" },
  { top: "Consistency", bottom: "Adaptation" },
  { top: "Execution Discipline", bottom: "Competitive Instinct" },
  { top: "Sustainability", bottom: "Pressure" },
];

const BRIEFS: Array<{ header: string; body: string }> = [
  {
    header: "Training Load ↔ Competitive Readiness",
    body: "Shows whether today’s emphasis is trending toward load-building or readiness-expression. Imbalance is a cue, not a verdict—sustained pull is what matters.",
  },
  {
    header: "Individual Development ↔ Team Performance",
    body: "Shows whether execution emphasis is leaning toward individual growth or collective outcomes. A strong pull can be intentional; watch for sustained neglect of the opposite pole.",
  },
  {
    header: "Consistency ↔ Adaptation",
    body: "Shows whether the system is favoring stability or responsiveness. Both are required; the risk emerges when one pole dominates long enough to reduce the other.",
  },
  {
    header: "Execution Discipline ↔ Competitive Instinct",
    body: "Shows whether execution is being driven more by structured control or competitive intuition. Healthy systems can lean either way—strain appears when the opposite pole is deprived over time.",
  },
  {
    header: "Sustainability ↔ Pressure",
    body: "Shows whether execution is behaving more sustainably or under pressure. Pressure can be necessary; the signal becomes meaningful when pressure stays elevated without recovery.",
  },
];

const DICHOTOMY_KEYS: DichotomyKey[] = [
  "training_load_vs_readiness",
  "individual_vs_team",
  "consistency_vs_adaptation",
  "discipline_vs_instinct",
  "sustainability_vs_pressure",
];

type BalanceRollup = {
  tension: number; // [-1..+1]
};

type ExecutionPanelState = "equilibrium" | "returning_to_equilibrium" | "out_of_equilibrium";

type ExecutionBalanceMapPanelProps = {
  rollups: BalanceRollup[] | null;

  /**
   * Optional: emit the current panel state and its semantic border class so parent
   * containers can tint outer chrome without duplicating threshold logic.
   */
  onPanelStateChange?: (payload: {
    panelState: ExecutionPanelState;
    borderClass: string;
  }) => void;
};

type BalanceSnapshotItem = {
  pairs_json?: Record<string, { tension?: number }>;
};

const PAIR_KEY_BY_DICHOTOMY: Record<DichotomyKey, string> = {
  training_load_vs_readiness: "training_load_vs_competitive_readiness",
  individual_vs_team: "individual_development_vs_team_performance",
  consistency_vs_adaptation: "consistency_vs_adaptation",
  discipline_vs_instinct: "program_discipline_vs_competitive_instinct",
  sustainability_vs_pressure: "sustainability_vs_pressure",
};

function clampTension(v: unknown) {
  return typeof v === "number" && !Number.isNaN(v) ? Math.max(-1, Math.min(1, v)) : 0;
}

// --- Tension severity helpers ---
type PullSeverity = "neutral" | "mild" | "elevated" | "strong";

function classifyPullSeverity(absTension: number): PullSeverity {
  if (absTension >= 0.7) return "strong";
  if (absTension >= 0.45) return "elevated";
  if (absTension >= 0.2) return "mild";
  return "neutral";
}

// --- Brief helpers for narrative panel ---
function describeCurrentRead(tension: number, top: string, bottom: string) {
  const abs = Math.abs(tension);
  const severity = classifyPullSeverity(abs);
  if (severity === "neutral") return "Current read: System appears balanced.";

  const direction = tension > 0 ? top : bottom;
  const label =
    severity === "mild"
      ? "Mild pull toward"
      : severity === "elevated"
      ? "Elevated pull toward"
      : "Strong pull toward";

  return `Current read: ${label} ${direction}.`;
}

const SOCRATIC_SEEDS: string[] = [
  "If this emphasis is intentional, what is it protecting right now?",
  "What is the system gaining here—and what might it be postponing?",
  "What assumption is being relied on to sustain this direction?",
  "If this instinct were dialed back slightly, what would improve first?",
  "What recovery signal would tell you this pressure has done its job?",
];

function severityToTabChrome(severity: PullSeverity) {
  switch (severity) {
    case "strong":
      return {
        border: "border-red-500/45",
        bg: "bg-red-500/10",
        title: "Strong pull",
      };
    case "elevated":
      return {
        border: "border-amber-500/45",
        bg: "bg-amber-500/10",
        title: "Elevated pull",
      };
    case "mild":
      return {
        border: "border-sky-400/40",
        bg: "bg-sky-400/10",
        title: "Mild pull",
      };
    default:
      return {
        border: "border-border/60",
        bg: "bg-background/20",
        title: "Balanced",
      };
  }
}

// --- Visualization normalization ---
// Goal: equal perceptual “weight” across dichotomies without changing the underlying truth.
// We normalize only for the field renderer; strain registry continues to receive raw tensions.

const VIZ_DEADBAND = 0.06; // ignore micro-noise so near-zero reads stable
const VIZ_CURVE = 1.35; // >1 increases mid-range legibility without exaggerating extremes

const VIZ_GAIN: Record<DichotomyKey, number> = {
  training_load_vs_readiness: 1.0,
  individual_vs_team: 1.0,
  consistency_vs_adaptation: 1.0,
  discipline_vs_instinct: 1.0,
  sustainability_vs_pressure: 1.0,
};

function normalizeForViz(key: DichotomyKey, raw: number) {
  const x = clampTension(raw);

  // deadband
  const ax = Math.abs(x);
  if (ax <= VIZ_DEADBAND) return 0;

  // rescale remaining range to 0..1
  const t = (ax - VIZ_DEADBAND) / (1 - VIZ_DEADBAND);

  // curve response
  const shaped = Math.pow(t, VIZ_CURVE);

  // per-dichotomy gain
  const g = VIZ_GAIN[key] ?? 1;

  const out = Math.min(1, shaped * g);
  return Math.sign(x) * out;
}

export default function ExecutionBalanceMapPanel({
  rollups,
  onPanelStateChange,
}: ExecutionBalanceMapPanelProps) {
  const [isBriefOpen, setIsBriefOpen] = useState(false);
  const [selectedPairIndex, setSelectedPairIndex] = useState<number | null>(null);
  const [isBrainstormOpen, setIsBrainstormOpen] = useState(false);

  const params = useParams<{ programId?: string }>();

  const programId = useMemo(() => {
    const raw = params?.programId;
    return typeof raw === "string" && raw.length > 0 ? raw : null;
  }, [params]);

  const [fetchedRollups, setFetchedRollups] = useState<BalanceRollup[] | null>(null);

  const prevAggAbsRef = useRef<number>(0);
  const prevStateRef = useRef<EquilibriumState | undefined>(undefined);
  const tensionRowRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (rollups && rollups.length) return;
    if (!programId) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(
          `/api/performance/rollups/teams?mode=balance&programId=${encodeURIComponent(
            programId
          )}&lens_code=season&limit=1`,
          { method: "GET" }
        );

        if (!res.ok) {
          console.warn("[ExecutionBalanceMapPanel] rollups fetch failed", res.status);
          return;
        }

        const json = await res.json();
        const item: BalanceSnapshotItem | undefined = json?.items?.[0];
        const pairs = item?.pairs_json || {};

        const mapped: BalanceRollup[] = DICHOTOMY_KEYS.map((k) => {
          const apiKey = PAIR_KEY_BY_DICHOTOMY[k];
          return { tension: clampTension(pairs?.[apiKey]?.tension) };
        });

        if (!cancelled) setFetchedRollups(mapped);
      } catch (e) {
        console.warn("[ExecutionBalanceMapPanel] rollups fetch error", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [rollups, programId]);

  const tensions = useMemo(() => {
    const src = rollups && rollups.length ? rollups : fetchedRollups;
    const out: number[] = [];
    for (let i = 0; i < DICHOTOMY_KEYS.length; i++) {
      out.push(clampTension(src?.[i]?.tension));
    }
    return out;
  }, [rollups, fetchedRollups]);



  const [panelState, setPanelState] = useState<ExecutionPanelState>("equilibrium");

  useEffect(() => {
    const epsilon = defaultStrainAccumulatorConfig.band;
    const delta = 0.03;

    const aggAbsNow = Math.max(0, ...tensions.map((t) => Math.abs(t)));

    const { state } = classifyEquilibriumState({
      tensionNow: aggAbsNow,
      tensionPrev: prevAggAbsRef.current,
      epsilon,
      delta,
      prevState: prevStateRef.current,
    });

    prevAggAbsRef.current = aggAbsNow;
    prevStateRef.current = state;

    const nextPanelState: ExecutionPanelState =
      state === "equilibrium"
        ? "equilibrium"
        : state === "returning"
        ? "returning_to_equilibrium"
        : "out_of_equilibrium";

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPanelState(nextPanelState);
  }, [tensions]);

const brainstormContext: BrainstormContext | null = useMemo(() => {
    if (!tensions?.length) return null;
    if (!programId) return null;

    const idx = selectedPairIndex ?? 0;
    const pair = PAIRS[idx];
    if (!pair) return null;

    const t = clampTension(tensions[idx] ?? 0);
    const abs = Math.abs(t);
    const sev = classifyPullSeverity(abs);

    const severityLabel =
      sev === "neutral"
        ? "Balanced"
        : sev === "mild"
        ? "Mild pull"
        : sev === "elevated"
        ? "Elevated pull"
        : "Strong pull";

    const direction = abs <= VIZ_DEADBAND ? "balanced" : t > 0 ? "top" : "bottom";

    return {
      programId,
      scopeType: "execution_balance",
      scopeId: DICHOTOMY_KEYS[idx],
      dichotomyKey: DICHOTOMY_KEYS[idx] ?? "unknown",
      topLabel: pair.top,
      bottomLabel: pair.bottom,
      tension: t,
      severityLabel,
      direction,
      panelState,
    };
  }, [tensions, selectedPairIndex, panelState, programId]);

  const equilibriumCopy = useMemo(() => {
    if (panelState === "equilibrium") {
      return {
        headline: "Your competitive system appears to be in equilibrium.",
        cta: "Click here to enter the Brief",
      };
    }

    if (panelState === "returning_to_equilibrium") {
      return {
        headline: "Your competitive system appears to be moving back toward equilibrium.",
        cta: "Click here to enter the Brief",
      };
    }

    return {
      headline: "Something appears to be pulling your competitive system out of equilibrium.",
      cta: "Click here to enter the Brief",
    };
  }, [panelState]);

  const panelChrome = useMemo(() => {
    switch (panelState) {
      case "out_of_equilibrium":
        return {
          border: "border-amber-500/45",
          hoverBorder: "hover:border-amber-500/55",
          glow: "shadow-[0_0_28px_rgba(245,158,11,0.12)]",
          focus: "focus-visible:ring-amber-400/40",
        };
      case "returning_to_equilibrium":
        return {
          border: "border-sky-400/40",
          hoverBorder: "hover:border-sky-400/50",
          glow: "shadow-[0_0_28px_rgba(56,189,248,0.10)]",
          focus: "focus-visible:ring-sky-400/35",
        };
      default:
        return {
          border: "",
          hoverBorder: "hover:border-border/70",
          glow: "",
          focus: "",
        };
    }
  }, [panelState]);

  useEffect(() => {
    onPanelStateChange?.({ panelState, borderClass: panelChrome.border });
  }, [panelState, panelChrome.border, onPanelStateChange]);

  useEffect(() => {
    if (!isBriefOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsBriefOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isBriefOpen]);

  useEffect(() => {
    if (!isBriefOpen) return;
    if (selectedPairIndex == null) return;

    const id = window.setTimeout(() => {
      const el = tensionRowRefs.current[selectedPairIndex];
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 0);

    return () => window.clearTimeout(id);
  }, [isBriefOpen, selectedPairIndex]);

  useEffect(() => {
    const now = Date.now();
    DICHOTOMY_KEYS.forEach((key, i) => {
      updateStrain(key, { t: now, x: tensions[i] ?? 0 });
    });
  }, [tensions]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Execution Equilibrium</h2>
        <div className="text-xs text-muted-foreground">Hover to learn more</div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
        {PAIRS.map((p, i) => (
          <button
            key={p.top}
            type="button"
            className={[
              "group rounded-xl p-3 text-left transition",
              "bg-background/0 hover:bg-accent/30 active:bg-accent/40",
              "border border-transparent hover:border-border/70",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "hover:shadow-[0_0_22px_rgba(255,255,255,0.06)]",
            ].join(" ")}
            aria-label={`${p.top} versus ${p.bottom}`}
            onClick={() => {
              setSelectedPairIndex(i);
              setIsBriefOpen(true);
            }}
          >
            <div className="text-center text-xs text-muted-foreground">{p.top}</div>

            <div className="flex items-center justify-center py-1 transition-transform group-hover:scale-[1.01]">
              <VerticalBalanceField
                distributionX={normalizeForViz(DICHOTOMY_KEYS[i]!, tensions[i] ?? 0)}
                strainHeat01={0}
                strainTarget={null}
                suppressStrain={true}
                width={200}
                height={330}
                briefHeader={BRIEFS[i]?.header}
                briefBody={BRIEFS[i]?.body}
                briefPopoverClassName="-translate-x-1/2 -translate-y-[calc(100%+12px)]"
              />
            </div>

            <div className="text-center text-xs text-muted-foreground">{p.bottom}</div>
          </button>
        ))}
      </div>

      {/* Execution equilibrium briefing (clickable transition invitation) */}
      <div className="flex justify-center pt-1">
        <button
          type="button"
          data-state={panelState}
          className={[
            // size-to-content + centered
            "inline-flex flex-col items-center justify-center gap-1",
            // requested padding: 3px
            "p-[3px]",
            // styling (keeps a border for later GLASS refinement)
            "rounded-xl border border-border/60",
            panelChrome.border,
            panelChrome.hoverBorder,
            // button affordance + hue shifts
            "bg-background/40 hover:bg-accent/25 active:bg-accent/35",
            "transition-colors",
            panelChrome.glow,
            // Enhance hover glow
            "hover:shadow-[0_0_22px_rgba(0,0,0,0.22)]",
            // Add cursor pointer
            "cursor-pointer",
            // Add active state
            "active:scale-[0.99] active:shadow-none",
            // accessibility focus
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            panelChrome.focus,
          ].join(" ")}
          aria-label="Enter the Brief to understand execution equilibrium"
          onClick={() => {
            setIsBriefOpen(true);
            // keep selectedPairIndex as-is so a coach can open the brief “in place”
          }}
        >
          <p className="px-3 pt-2 text-center text-sm text-foreground">{equilibriumCopy.headline}</p>
          <p className="px-3 pb-2 text-center text-xs text-muted-foreground">{equilibriumCopy.cta}</p>
        </button>
      </div>

      {/* Brief modal (shared Glass shell) */}
      <GlassModalShell
        open={isBriefOpen}
        onClose={() => setIsBriefOpen(false)}
        maxWidthClassName="max-w-4xl"
        heightClassName="max-h-[85vh]"
      >
        <div className="flex max-h-full flex-col overflow-hidden">
          {/* Header (non-scrolling) */}
          <div className="shrink-0 pb-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold">Brief (LIVE TEST)</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  A coach-facing explanation layer that translates the map into actionable clarity.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-white/10 bg-background/10 px-3 py-2 text-xs transition hover:bg-accent/20 backdrop-blur-xl"
                  onClick={() => setIsBriefOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>

          {/* Body (scrolls) */}
          <div className="min-h-0 flex-1 overflow-y-auto pt-4">
            <div className="space-y-4 pb-4">
              {/* Top row: two horizontally opposed panels */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-stretch">
                <div className="h-full rounded-xl border border-white/10 bg-background/20 p-4 backdrop-blur-xl">
                  <p className="text-sm font-semibold">What you’re seeing</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    This map is a balance surface. Each field represents a tension your system must hold at speed.
                  </p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    A pull is not a problem by itself. It becomes meaningful when it persists long enough to cost the opposite pole.
                  </p>
                </div>

                <div className="h-full rounded-xl border border-white/10 bg-background/20 p-4 backdrop-blur-xl">
                  <p className="text-sm font-semibold">How to use this brief</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    <li>Identify the strongest pull — then ask what it is optimizing for.</li>
                    <li>Look for what the opposite pole is being asked to sacrifice.</li>
                    <li>If the pull is intentional, decide what recovery looks like — and when.</li>
                  </ul>
                </div>
              </div>

              {/* Full-width: tabbed tension briefing */}
              <div className="rounded-xl border border-white/10 bg-background/20 p-4 backdrop-blur-xl">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-semibold">Tensions</p>
                  </div>

                  <div className="relative">
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 pr-6">
                      {PAIRS.map((p, idx) => {
                        const isActive = (selectedPairIndex ?? 0) === idx;
                        const abs = Math.abs(tensions[idx] ?? 0);
                        const severity = classifyPullSeverity(abs);
                        const sev = severityToTabChrome(severity);
                        return (
                          <button
                            key={p.top}
                            type="button"
                            title={sev.title}
                            className={[
                              "shrink-0 rounded-full border px-3 py-1 text-xs transition",
                              isActive
                                ? "border-border/80 bg-accent/30 text-foreground shadow-[0_0_18px_rgba(255,255,255,0.06)]"
                                : `${sev.border} ${sev.bg} text-muted-foreground hover:bg-accent/15 hover:text-foreground`,
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                            ].join(" ")}
                            onClick={() => setSelectedPairIndex(idx)}
                            aria-label={`Select tension ${p.top} versus ${p.bottom}`}
                            aria-pressed={isActive}
                          >
                            {p.top}
                          </button>
                        );
                      })}
                    </div>
                    <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-background/70 to-transparent" />
                  </div>
                </div>

                {(() => {
                  const idx = selectedPairIndex ?? 0;
                  const p = PAIRS[idx];
                  const b = BRIEFS[idx];
                  return (
                    <div className="mt-3 rounded-lg border border-white/10 bg-background/15 p-5 backdrop-blur-xl">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-base font-semibold">
                            {p?.top} <span className="text-muted-foreground">↔</span> {p?.bottom}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">Tension briefing</p>
                          <p className="mt-2 text-sm text-muted-foreground">{b?.body}</p>
                          <div className="mt-3 inline-flex max-w-full items-center rounded-full border border-white/10 bg-background/10 px-3 py-1 text-xs text-muted-foreground backdrop-blur-xl">
                            {describeCurrentRead(tensions[idx] ?? 0, p?.top ?? "", p?.bottom ?? "")}
                          </div>
                          <p className="mt-4 text-sm text-foreground">
                            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prompt</span>
                            <span className="ml-2">{SOCRATIC_SEEDS[idx]}</span>
                          </p>
                        </div>

                        {/* Inset: ties narrative back to the same balance field language */}
                        <div className="shrink-0 sm:pl-5">
                          <div className="rounded-lg border border-white/10 bg-background/10 p-3 backdrop-blur-xl">
                            <div className="flex items-center justify-center">
                              <VerticalBalanceField
                                distributionX={normalizeForViz(DICHOTOMY_KEYS[idx]!, tensions[idx] ?? 0)}
                                strainHeat01={0}
                                strainTarget={null}
                                suppressStrain={true}
                                width={140}
                                height={248}
                                briefHeader={undefined}
                                briefBody={undefined}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-muted-foreground">
                    Tip: Hover individual fields on the map for quick context; use this Brief for the full narrative.
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">Ready to discuss?</span>

                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-background/10 px-3 py-2 text-xs transition hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 backdrop-blur-xl"
                      onClick={() => {
                        setIsBriefOpen(false);
                        setIsBrainstormOpen(true);
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        aria-hidden="true"
                      >
                        <defs>
                          <linearGradient id="brainGrad" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#f472b6" stopOpacity="0.95" />
                            <stop offset="55%" stopColor="#fb7185" stopOpacity="0.95" />
                            <stop offset="100%" stopColor="#f97316" stopOpacity="0.95" />
                          </linearGradient>
                        </defs>

                        <path
                          d="M9.1 6.4c-.6-1.1-2-1.6-3.2-.9C4.6 6.2 4.2 7.7 5 8.9c-.9.7-1.1 2.1-.4 3.1.3.5.8.8 1.3.9-.4 1 .1 2.2 1.1 2.7.6.3 1.2.3 1.8.1.4 1 1.5 1.6 2.6 1.3 1-.2 1.8-1.2 1.8-2.2V8.2c0-1.1-.7-2-1.7-2.3-.9-.2-1.9.2-2.4 1.1z"
                          fill="url(#brainGrad)"
                        />
                        <path
                          d="M14.9 6.4c.6-1.1 2-1.6 3.2-.9 1.2.7 1.6 2.2.9 3.4.9.7 1.1 2.1.4 3.1-.3.5-.8.8-1.3.9.4 1-.1 2.2-1.1 2.7-.6.3-1.2.3-1.8.1-.4 1-1.5 1.6-2.6 1.3-1-.2-1.8-1.2-1.8-2.2V8.2c0-1.1.7-2 1.7-2.3.9-.2 1.9.2 2.4 1.1z"
                          fill="url(#brainGrad)"
                          opacity="0.92"
                        />

                        <path
                          d="M12 7.2v9.4"
                          stroke="rgba(255,255,255,0.6)"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                        />

                        <path
                          d="M8.2 9.1c1 .1 1.7.8 1.7 1.8M8.2 12c1 .1 1.7.8 1.7 1.8M15.8 9.1c-1 .1-1.7.8-1.7 1.8M15.8 12c-1 .1-1.7.8-1.7 1.8"
                          stroke="rgba(255,255,255,0.55)"
                          strokeWidth="1.1"
                          strokeLinecap="round"
                          fill="none"
                        />
                      </svg>
                      <span>Enter Brainstorm</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </GlassModalShell>
      {brainstormContext ? (
        <BrainstormModal
          open={isBrainstormOpen}
          onClose={() => setIsBrainstormOpen(false)}
          context={brainstormContext}
        />
      ) : null}
    </div>
  );
}