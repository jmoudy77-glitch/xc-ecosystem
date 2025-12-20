// app/programs/[programId]/scoring/ProgramScoringPageClient.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ProgramScoringWeights = {
  academic: number;
  performance: number;
  availability: number;
  conduct: number;
};

type ProgramScoringProfile = {
  id: string | null;
  label: string;
  weights: ProgramScoringWeights;
  is_default: boolean;
  created_at: string | null;
  updated_at: string | null;
};

type LoadResponse =
  | {
      ok: true;
      programId: string;
      programName: string | null;
      currentProfile: ProgramScoringProfile | null;
    }
  | {
      ok: false;
      error: string;
    };

type SaveResponse =
  | { ok: true; scoring_profile: ProgramScoringProfile }
  | { ok: false; error: string };

type Props = {
  programId: string;
};

const DEFAULT_WEIGHTS: ProgramScoringWeights = {
  academic: 25,
  performance: 40,
  availability: 20,
  conduct: 15,
};

function clampWeights(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}

export default function ProgramScoringPageClient({ programId }: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [programName, setProgramName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [profileId, setProfileId] = useState<string | null>(null);
  const [label, setLabel] = useState<string>("Default scoring profile");
  const [weights, setWeights] = useState<ProgramScoringWeights>(DEFAULT_WEIGHTS);
  const [isDefault, setIsDefault] = useState<boolean>(true);

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadInitial() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `/api/programs/${programId}/scoring/profile`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        const body = (await res.json().catch(() => ({}))) as LoadResponse;

        if (!res.ok || !body || !("ok" in body)) {
          setError(
            `Failed to load scoring settings (${res.status}): ${
              "error" in body && body.error ? body.error : "Unknown error"
            }`,
          );
          return;
        }

        if (!body.ok) {
          setError(body.error || "Failed to load scoring settings.");
          return;
        }

        if (!isMounted) return;

        setProgramName(body.programName ?? null);

        if (body.currentProfile) {
          setProfileId(body.currentProfile.id);
          setLabel(body.currentProfile.label || "Default scoring profile");
          setWeights({
            academic:
              body.currentProfile.weights?.academic ??
              DEFAULT_WEIGHTS.academic,
            performance:
              body.currentProfile.weights?.performance ??
              DEFAULT_WEIGHTS.performance,
            availability:
              body.currentProfile.weights?.availability ??
              DEFAULT_WEIGHTS.availability,
            conduct:
              body.currentProfile.weights?.conduct ??
              DEFAULT_WEIGHTS.conduct,
          });
          setIsDefault(body.currentProfile.is_default ?? true);
        } else {
          setProfileId(null);
          setLabel("Default scoring profile");
          setWeights(DEFAULT_WEIGHTS);
          setIsDefault(true);
        }
      } catch (err: any) {
        console.error("[ProgramScoringPageClient] load error:", err);
        if (!isMounted) return;
        setError("Unexpected error while loading scoring settings.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadInitial();

    return () => {
      isMounted = false;
    };
  }, [programId]);

  function handleWeightChange(key: keyof ProgramScoringWeights, value: string) {
    const numeric = Number(value);
    const clamped = clampWeights(numeric);
    setWeights((prev) => ({ ...prev, [key]: clamped }));
  }

  async function handleSave() {
    try {
      setSaving(true);
      setSaveMessage(null);
      setError(null);

      const total =
        weights.academic +
        weights.performance +
        weights.availability +
        weights.conduct;

      if (total !== 100) {
        setError(
          `Weights must add up to 100%. Current total is ${total}%.`,
        );
        return;
      }

      const payload = {
        label,
        weights,
        is_default: isDefault,
      };

      const res = await fetch(
        `/api/programs/${programId}/scoring/profile`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const body = (await res.json().catch(() => ({}))) as SaveResponse;

      if (!res.ok || !body.ok) {
        const message =
          !body.ok && "error" in body && body.error
            ? body.error
            : `Failed to save scoring settings (${res.status})`;
        setError(message);
        return;
      }

      setSaveMessage("Scoring settings saved.");
      setProfileId(body.scoring_profile.id ?? null);
      setIsDefault(body.scoring_profile.is_default ?? true);
    } catch (err: any) {
      console.error("[ProgramScoringPageClient] save error:", err);
      setError("Unexpected error while saving scoring settings.");
    } finally {
      setSaving(false);
    }
  }

  const totalWeight =
    weights.academic +
    weights.performance +
    weights.availability +
    weights.conduct;

  const totalIsValid = totalWeight === 100;

  return (
    <div className="p-6 space-y-4">
      {/* Page title / description */}
      <div>
        <h1 className="text-sm font-semibold text-slate-100">
          Program scoring &amp; evaluation
        </h1>
        <p className="text-[11px] text-muted">
          Customize how your program weights academic, performance,
          availability, and conduct factors for the global athlete score.
        </p>
        {programName && (
          <p className="mt-1 text-[11px] text-muted">
            Program:{" "}
            <span className="font-mono text-[11px]">
              {programName}
            </span>
          </p>
        )}
      </div>

      {/* Loading / error states */}
      {loading && (
        <div className="p-6 text-sm text-muted">
          Loading scoring settings...
        </div>
      )}

      {!loading && error && (
        <div className="p-6 text-sm text-red-300">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="rounded-xl border border-subtle bg-surface p-4 space-y-4">
          {/* Current profile summary */}
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-slate-100">
                Current scoring profile
              </p>
              <p className="text-[11px] text-muted">
                This profile controls the base weights that feed into the
                global athlete score for your program. In the future,
                you&apos;ll be able to create multiple profiles (e.g., XC,
                distance, sprint/hurdles) and apply them per team or
                scenario.
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-muted">
                Total weight:{" "}
                <span
                  className={
                    totalIsValid
                      ? "font-mono text-[11px]"
                      : "font-mono text-[11px] text-red-300"
                  }
                >
                  {totalWeight}%
                </span>
              </p>
              {!totalIsValid && (
                <p className="text-[11px] text-red-300">
                  Must equal 100%.
                </p>
              )}
            </div>
          </div>

          {/* Form: label + weights */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-3">
              {/* Profile label */}
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-100">
                  Profile label
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="mt-1 w-full rounded-md border border-subtle bg-surface px-2 py-1 text-xs text-slate-100"
                  placeholder="e.g. Default program scoring"
                />
              </div>

              {/* Default flag */}
              <div className="space-y-1">
                <p className="block text-[11px] font-medium text-slate-100">
                  Default profile
                </p>
                <p className="text-[11px] text-muted">
                  This is currently the{" "}
                  {isDefault ? "default profile" : "active profile"} for
                  your program. Future: manage multiple profiles and
                  choose one as the default.
                </p>
              </div>
            </div>

            {/* Weights sliders / inputs */}
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-100">
                  Academic (GPA, test scores, coursework)
                </label>
                <div className="flex items-center gap-1 text-[11px] text-muted">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={weights.academic}
                    onChange={(e) =>
                      handleWeightChange("academic", e.target.value)
                    }
                    className="w-14 rounded border border-subtle bg-surface px-1 py-0.5 text-right text-[11px] text-slate-100"
                  />
                  <span>%</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-100">
                  Performance (PRs, consistency, championship results)
                </label>
                <div className="flex items-center gap-1 text-[11px] text-muted">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={weights.performance}
                    onChange={(e) =>
                      handleWeightChange(
                        "performance",
                        e.target.value,
                      )
                    }
                    className="w-14 rounded border border-subtle bg-surface px-1 py-0.5 text-right text-[11px] text-slate-100"
                  />
                  <span>%</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-100">
                  Availability (injury history, reliability, training
                  volume)
                </label>
                <div className="flex items-center gap-1 text-[11px] text-muted">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={weights.availability}
                    onChange={(e) =>
                      handleWeightChange(
                        "availability",
                        e.target.value,
                      )
                    }
                    className="w-14 rounded border border-subtle bg-surface px-1 py-0.5 text-right text-[11px] text-slate-100"
                  />
                  <span>%</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-100">
                  Conduct (character, coachability, team impact)
                </label>
                <div className="flex items-center gap-1 text-[11px] text-muted">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={weights.conduct}
                    onChange={(e) =>
                      handleWeightChange("conduct", e.target.value)
                    }
                    className="w-14 rounded border border-subtle bg-surface px-1 py-0.5 text-right text-[11px] text-slate-100"
                  />
                  <span>%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Guidance / future notes */}
          <div className="space-y-1">
            <p className="text-[11px] text-muted">
              Future: visualize how these weights influence the overall
              scout score for individual athletes and recruiting
              classes, and allow per-team overrides on top of this
              program baseline.
            </p>
            <p className="text-[11px] text-muted hover:text-slate-100 underline">
              In a later phase, we&apos;ll also incorporate your custom
              scoring profile into pipeline projections and roster
              scenario tools.
            </p>
          </div>

          {/* Save controls */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => router.refresh()}
              className="text-[11px] text-muted hover:text-slate-100 underline"
            >
              Reset changes
            </button>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="space-y-1">
              {saveMessage && (
                <div className="rounded-md border border-emerald-500/40 bg-emerald-900/30 px-3 py-2 text-[11px] text-emerald-200">
                  {saveMessage}
                </div>
              )}
              {!saveMessage && !totalIsValid && (
                <div className="rounded-md border border-red-500/40 bg-red-950/40 px-3 py-2 text-[11px] text-red-200">
                  Weights must total 100% before saving.
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !totalIsValid}
              className="rounded-md bg-brand px-4 py-2 text-xs font-medium text-slate-950 hover:bg-brand-soft disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save scoring settings"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}