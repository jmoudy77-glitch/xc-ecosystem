"use client";
// components/performance/map/ProgramBalanceMapPanel.tsx
import VerticalBalanceField from "./VerticalBalanceField";
import { useEffect, useMemo, useRef, useState } from "react";
import { updateStrain } from "../../../lib/performance/strainRegistry";
import type { DichotomyKey } from "../../../lib/performance/strainRegistry";
import { defaultStrainAccumulatorConfig } from "../../../lib/performance/strainAccumulator";

type Pair = {
  top: string;
  bottom: string;
};

const PAIRS: Pair[] = [
  { top: "Training Load", bottom: "Competitive Readiness" },
  { top: "Individual Development", bottom: "Team Performance" },
  { top: "Consistency", bottom: "Adaptation" },
  { top: "Program Discipline", bottom: "Competitive Instinct" },
  { top: "Sustainability", bottom: "Pressure" },
];


const DICHOTOMY_KEYS: DichotomyKey[] = [
  "training_load_vs_readiness",
  "individual_vs_team",
  "consistency_vs_adaptation",
  "discipline_vs_instinct",
  "sustainability_vs_pressure",
];

// Placeholder demo values (replace with computed rollups later)
const DEMO = [
  { tension: +0.65, severity: 0.75 },
  { tension: -0.25, severity: 0.35 },
  { tension: +0.05, severity: 0.1 },
  { tension: -0.55, severity: 0.65 },
  { tension: +0.3, severity: 0.45 },
];

export default function ProgramBalanceMapPanel() {
  const [isProgramBriefOpen, setIsProgramBriefOpen] = useState(false);
  const [briefView, setBriefView] = useState<"program" | "team">("program");
  const [lens, setLens] = useState<"season" | "three_year">("season");

  const prevOutOfBandRef = useRef(false);

  const panelState = useMemo(() => {
    const band = defaultStrainAccumulatorConfig.band;
    const outOfBandNow = DEMO.some((d) => Math.abs(d.tension) > band);

    if (outOfBandNow) {
      prevOutOfBandRef.current = true;
      return "out_of_equilibrium" as const;
    }

    if (prevOutOfBandRef.current) {
      // once we have been out of equilibrium, the first return inside the band reads as “returning”
      return "returning_to_equilibrium" as const;
    }

    return "equilibrium" as const;
  }, []);

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

  useEffect(() => {
    if (!isProgramBriefOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsProgramBriefOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isProgramBriefOpen]);

  useEffect(() => {
    const now = Date.now();
    DICHOTOMY_KEYS.forEach((key, i) => {
      updateStrain(key, { t: now, x: DEMO[i].tension });
    });
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Execution Equilibrium</h2>
        <div className="text-xs text-muted-foreground">
          Hover to learn more (next)
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
        {PAIRS.map((p, i) => (
          <button
            key={p.top}
            type="button"
            className="rounded-xl p-3 text-left transition hover:bg-accent/30"
            aria-label={`${p.top} versus ${p.bottom}`}
          >
            <div className="text-center text-xs text-muted-foreground">{p.top}</div>

            <div className="flex items-center justify-center py-1">
              <VerticalBalanceField
                distributionX={DEMO[i].tension}
                strainHeat01={0}
                strainTarget={null}
                suppressStrain={true}
                width={200}
                height={330}
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
          className={[
            // size-to-content + centered
            "inline-flex flex-col items-center justify-center gap-1",
            // requested padding: 3px
            "p-[3px]",
            // styling (keeps a border for later GLASS refinement)
            "rounded-xl border border-border/60",
            // button affordance + hue shifts
            "bg-background/40 hover:bg-accent/25 active:bg-accent/35",
            "transition-colors",
            // accessibility focus
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          ].join(" ")}
          aria-label="Enter the Brief to understand execution equilibrium"
          onClick={() => {
            setBriefView("program");
            setIsProgramBriefOpen(true);
          }}
        >
          <p className="px-3 pt-2 text-center text-sm text-foreground">
            {equilibriumCopy.headline}
          </p>
          <p className="px-3 pb-2 text-center text-xs text-muted-foreground">
            {equilibriumCopy.cta}
          </p>
        </button>
      </div>
      {/* Brief modal (placeholder scaffold; no data wiring yet) */}
      {isProgramBriefOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Brief"
        >
          {/* backdrop */}
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close Brief"
            onClick={() => setIsProgramBriefOpen(false)}
          />

          {/* modal */}
          <div className="relative mx-4 w-full max-w-4xl rounded-2xl border border-border/60 bg-background/90 p-4 shadow-xl backdrop-blur">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold">Brief</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  A coach-facing explanation layer that translates the map into actionable clarity.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* View toggle: Program vs Team */}
                <div className="inline-flex overflow-hidden rounded-lg border border-border/60">
                  <button
                    type="button"
                    className={[
                      "px-3 py-2 text-xs transition",
                      briefView === "program" ? "bg-accent/35" : "hover:bg-accent/20",
                    ].join(" ")}
                    onClick={() => setBriefView("program")}
                    aria-pressed={briefView === "program"}
                  >
                    System
                  </button>
                  <button
                    type="button"
                    className={[
                      "px-3 py-2 text-xs transition",
                      briefView === "team" ? "bg-accent/35" : "hover:bg-accent/20",
                    ].join(" ")}
                    onClick={() => setBriefView("team")}
                    aria-pressed={briefView === "team"}
                  >
                    Team
                  </button>
                </div>

                {/* Lens toggle */}
                <div className="inline-flex overflow-hidden rounded-lg border border-border/60">
                  <button
                    type="button"
                    className={[
                      "px-3 py-2 text-xs transition",
                      lens === "season" ? "bg-accent/35" : "hover:bg-accent/20",
                    ].join(" ")}
                    onClick={() => setLens("season")}
                    aria-pressed={lens === "season"}
                  >
                    This Season
                  </button>
                  <button
                    type="button"
                    className={[
                      "px-3 py-2 text-xs transition",
                      lens === "three_year" ? "bg-accent/35" : "hover:bg-accent/20",
                    ].join(" ")}
                    onClick={() => setLens("three_year")}
                    aria-pressed={lens === "three_year"}
                  >
                    3-Year
                  </button>
                </div>

                <button
                  type="button"
                  className="rounded-lg border border-border/60 px-3 py-2 text-xs hover:bg-accent/20"
                  onClick={() => setIsProgramBriefOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-5">
              {/* Left: macro + guidance */}
              <div className="md:col-span-2">
                <div className="rounded-xl border border-border/60 bg-background/40 p-3">
                  <p className="text-sm font-medium">What you’re seeing</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    The map is a balance surface. Each field represents a key tension your system must hold in
                    synchrony. Imbalance isn’t “bad” — it’s a cue.
                  </p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Placeholder: this copy will later reflect computed rollups for the selected lens and view.
                  </p>
                </div>

                <div className="mt-3 rounded-xl border border-border/60 bg-background/40 p-3">
                  <p className="text-sm font-medium">How to use this brief</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    <li>Scan the five tensions for the strongest pull.</li>
                    <li>Ask “what is this optimizing for?” before you ask “what is wrong?”</li>
                    <li>Transition to Brainstorm when you’re ready to convert insight into action.</li>
                  </ul>
                </div>
              </div>

              {/* Right: per-dichotomy rows */}
              <div className="md:col-span-3">
                <div className="rounded-xl border border-border/60 bg-background/40 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Tensions</p>
                    <p className="text-xs text-muted-foreground">{briefView === "program" ? "System" : "Team"} • {lens === "season" ? "This Season" : "3-Year"}</p>
                  </div>

                  <div className="mt-3 space-y-3">
                    {PAIRS.map((p) => (
                      <div key={p.top} className="rounded-lg border border-border/60 bg-background/30 p-3">
                        <p className="text-sm font-medium">
                          {p.top} <span className="text-muted-foreground">↔</span> {p.bottom}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Placeholder explanation for how this tension is currently behaving, why it matters, and what
                          a coach should look at next.
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-muted-foreground">
                    Tip: Hover individual fields on the map for quick context; use this Brief for the full narrative.
                  </div>
                  <button
                    type="button"
                    className="rounded-lg border border-border/60 px-3 py-2 text-xs hover:bg-accent/20"
                    onClick={() => {
                      // placeholder until Brainstorm modal exists
                      // eslint-disable-next-line no-console
                      console.log("[performance] open Brainstorm (placeholder)");
                    }}
                  >
                    Open Brainstorm
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}