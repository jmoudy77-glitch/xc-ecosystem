"use client";
// components/performance/map/BrainstormModal.tsx
import { GlassModalShell } from "@/components/ui/GlassModalShell";

export type BrainstormPanelState =
  | "equilibrium"
  | "returning_to_equilibrium"
  | "out_of_equilibrium";

export type BrainstormDirection = "top" | "bottom" | "balanced";

export type BrainstormContext = {
  dichotomyKey: string;
  topLabel: string;
  bottomLabel: string;
  tension: number; // [-1..+1]
  severityLabel: string; // e.g. "Balanced" | "Mild pull" | "Elevated pull" | "Strong pull"
  direction: BrainstormDirection;
  panelState: BrainstormPanelState;
};

type BrainstormModalProps = {
  open: boolean;
  onClose: () => void;
  context: BrainstormContext | null;
};

function clamp01(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function deriveHeader(context: BrainstormContext | null) {
  if (!context) {
    return {
      title: "Brainstorm",
      subtitle: "Guided questions will appear here once a tension is selected.",
    };
  }

  const dir =
    context.direction === "balanced"
      ? "Balanced"
      : context.direction === "top"
      ? `Leaning toward ${context.topLabel}`
      : `Leaning toward ${context.bottomLabel}`;

  return {
    title: "Brainstorm",
    subtitle: `${context.topLabel} ↔ ${context.bottomLabel} · ${dir}`,
  };
}

export default function BrainstormModal({ open, onClose, context }: BrainstormModalProps) {
  const { title, subtitle } = deriveHeader(context);

  // local “session readiness” meter (placeholder; will become real when we wire prompts)
  const readiness = clamp01(context ? Math.abs(context.tension) : 0);

  return (
    <GlassModalShell
      open={open}
      onClose={onClose}
      maxWidthClassName="max-w-4xl"
      heightClassName="max-h-[85vh]"
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="shrink-0 pb-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>

              {/* Mini context chip */}
              {context ? (
                <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-background/10 px-3 py-1 text-xs text-muted-foreground backdrop-blur-xl">
                  <span>{context.severityLabel}</span>
                  <span className="opacity-60">•</span>
                  <span>tension {context.tension.toFixed(2)}</span>
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-lg border border-white/10 bg-background/10 px-3 py-2 text-xs transition hover:bg-accent/20 backdrop-blur-xl"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto pt-4">
          <div className="space-y-4 pb-4">
            {/* Top row: “ready” framing + placeholder controls */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-stretch">
              <div className="h-full rounded-xl border border-white/10 bg-background/20 p-4 backdrop-blur-xl">
                <p className="text-sm font-semibold">What happens here</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  This is a guided conversation layer. It turns the tension you’re seeing into
                  questions that lead toward a decision.
                </p>

                <div className="mt-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Session readiness
                  </p>

                  <div className="mt-2 h-2 w-full rounded-full bg-background/30">
                    <div
                      className="h-2 rounded-full bg-foreground/60 transition-all"
                      style={{ width: `${Math.round(readiness * 100)}%` }}
                    />
                  </div>

                  <p className="mt-2 text-xs text-muted-foreground">
                    This meter is placeholder for now. It will become “clarity confidence” once we
                    wire prompt outcomes.
                  </p>
                </div>
              </div>

              <div className="h-full rounded-xl border border-white/10 bg-background/20 p-4 backdrop-blur-xl">
                <p className="text-sm font-semibold">Controls (placeholder)</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  We’ll add structured inputs here (intent, constraints, and time horizon) after the
                  prompt set is finalized.
                </p>

                <div className="mt-4 grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-white/10 bg-background/10 px-3 py-2 text-left text-xs transition hover:bg-accent/20 backdrop-blur-xl"
                    onClick={() => {
                      // placeholder
                    }}
                  >
                    + Add constraint
                  </button>

                  <button
                    type="button"
                    className="rounded-lg border border-white/10 bg-background/10 px-3 py-2 text-left text-xs transition hover:bg-accent/20 backdrop-blur-xl"
                    onClick={() => {
                      // placeholder
                    }}
                  >
                    Capture decision
                  </button>
                </div>
              </div>
            </div>

            {/* Full-width prompt surface */}
            <div className="rounded-xl border border-white/10 bg-background/20 p-4 backdrop-blur-xl">
              <p className="text-sm font-semibold">Guided questions</p>
              <p className="mt-1 text-sm text-muted-foreground">
                We’ll wire the live prompt set next. For now, this is a stub that proves the modal
                shell + layout.
              </p>

              <div className="mt-4 rounded-lg border border-white/10 bg-background/15 p-5 backdrop-blur-xl">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Prompt 1</p>
                <p className="mt-2 text-sm text-foreground">
                  What is the system gaining by leaning this direction right now?
                </p>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-muted-foreground">
                    Tip: Answer quickly. Precision comes later.
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-white/10 bg-background/10 px-3 py-2 text-xs transition hover:bg-accent/20 backdrop-blur-xl"
                      onClick={() => {
                        // placeholder
                      }}
                    >
                      Next
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-white/10 bg-background/10 px-3 py-2 text-xs transition hover:bg-accent/20 backdrop-blur-xl"
                      onClick={() => {
                        // placeholder
                      }}
                    >
                      Summarize
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 text-xs text-muted-foreground">
                Future: this panel will support a Socratic flow, short answers, and a final “Decide →
                Execute” handoff.
              </div>
            </div>
          </div>
        </div>
      </div>
    </GlassModalShell>
  );
}