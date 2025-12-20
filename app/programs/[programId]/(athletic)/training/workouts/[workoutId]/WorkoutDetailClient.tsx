// app/programs/[programId]/training/workouts/[workoutId]/WorkoutDetailClient.tsx
// FILEPATH: /Users/joshmoudy/Library/CloudStorage/GoogleDrive-jmoudy77@gmail.com/My Drive/Ecosystem_Live/xc-ecosystem/app/programs/[programId]/training/workouts/[workoutId]/WorkoutDetailClient.tsx
// NOTE: Keep this header for future edits.
"use client";

import { useEffect, useMemo, useState } from "react";

type Workout = {
  id: string;
  program_id: string;
  label: string;
  description: string | null;
  is_system_template: boolean;
  created_at?: string;
  updated_at?: string;
};

type WorkoutStep = {
  id: string;
  workout_id: string;
  step_index: number;
  label: string | null;
  exercise_id: string | null;
  training_event_template_id: string | null;

  // Normalized shape (preferred)
  params?: any;

  // Legacy / alternate shapes (tolerated)
  parameters_override?: any;
  parametersOverride?: any;

  created_at?: string;
};

type NormalizedApiError = {
  code: string;
  message: string;
};

type NormalizedWorkoutDetail = {
  workout: Workout;
  steps: WorkoutStep[];
};

type NormalizedApiResponse = {
  ok: boolean;
  data: NormalizedWorkoutDetail | null;
  error: NormalizedApiError | null;
};

// Back-compat: tolerate older/alternate response shapes and normalize to a single predictable contract.
function normalizeWorkoutDetailResponse(input: unknown): NormalizedApiResponse {
  const fallback: NormalizedApiResponse = {
    ok: false,
    data: null,
    error: { code: "UNKNOWN", message: "Unexpected response." },
  };

  if (!input || typeof input !== "object") return fallback;

  const obj = input as any;

  // Preferred shape
  if (typeof obj.ok === "boolean") {
    const ok = Boolean(obj.ok);
    const data = obj.data ?? null;
    const err = obj.error ?? null;

    const workout = data?.workout ?? null;
    const steps = Array.isArray(data?.steps) ? (data.steps as WorkoutStep[]) : [];

    if (!ok) {
      const message =
        typeof err?.message === "string"
          ? err.message
          : typeof obj.message === "string"
            ? obj.message
            : "Request failed.";

      return {
        ok: false,
        data: null,
        error: { code: typeof err?.code === "string" ? err.code : "REQUEST_FAILED", message },
      };
    }

    if (!workout) {
      return {
        ok: false,
        data: null,
        error: { code: "NOT_FOUND", message: "Workout not found." },
      };
    }

    return {
      ok: true,
      data: {
        workout,
        steps: steps.slice().sort((a, b) => a.step_index - b.step_index),
      },
      error: null,
    };
  }

  // Legacy shape: { workout?: ..., steps?: ..., error?: string }
  const legacyWorkout = obj.workout ?? null;
  const legacySteps = Array.isArray(obj.steps) ? (obj.steps as WorkoutStep[]) : [];

  if (typeof obj.error === "string" && obj.error.trim()) {
    return { ok: false, data: null, error: { code: "LEGACY_ERROR", message: obj.error } };
  }

  if (!legacyWorkout) {
    return {
      ok: false,
      data: null,
      error: { code: "NOT_FOUND", message: "Workout not found." },
    };
  }

  return {
    ok: true,
    data: {
      workout: legacyWorkout as Workout,
      steps: legacySteps.slice().sort((a, b) => a.step_index - b.step_index),
    },
    error: null,
  };
}

function safeJsonPreview(value: unknown): string {
  if (value == null) return "";
  try {
    const s = JSON.stringify(value);
    if (!s || s === "{}" || s === "[]") return "";
    return s.length > 120 ? `${s.slice(0, 120)}…` : s;
  } catch {
    return "";
  }
}

function humanizeKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\bmin\b/g, "min")
    .replace(/\bmax\b/g, "max")
    .replace(/\bsec\b/g, "sec")
    .replace(/\bm\b/g, "m")
    .replace(/\bwbgt\b/gi, "WBGT")
    .replace(/\bpr\b/gi, "PR")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

function prettyPrimitive(v: any): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  const s = safeJsonPreview(v);
  return s || "…";
}

function paramsToEntries(params: any): Array<[string, string]> {
  if (!params || typeof params !== "object" || Array.isArray(params)) return [];

  const priority: Record<string, number> = {
    intensity: 1,
    target_pace: 2,
    duration_min: 3,
    duration_sec: 4,
    distance_m: 5,
    reps: 6,
    reps_min: 7,
    reps_max: 8,
    rest: 9,
    rest_type: 10,
  };

  const labelMap: Record<string, string> = {
    intensity: "Intensity",
    target_pace: "Target pace",
    duration_min: "Duration (min)",
    duration_sec: "Duration (sec)",
    distance_m: "Distance (m)",
    reps: "Reps",
    reps_min: "Reps (min)",
    reps_max: "Reps (max)",
    rest: "Rest",
    rest_type: "Rest type",
  };

  return Object.entries(params)
    .filter(([_, v]) => v !== null && v !== undefined && v !== "")
    .sort(([a], [b]) => (priority[a] ?? 50) - (priority[b] ?? 50))
    .map(([k, v]) => [
      labelMap[k] ?? k,
      typeof v === "string" ? v.replace(/_/g, " ") : String(v),
    ]);
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function badgeVariantClass(variant: "brand" | "secondary" | "danger") {
  // Back-compat: include both the older `badge-*` variant classes and the newer
  // `badge--*` variant classes (if present in globals.css).
  return cx(
    "badge",
    variant === "brand" && "badge-brand badge--brand",
    variant === "secondary" && "badge-secondary badge--secondary",
    variant === "danger" && "badge-danger badge--danger"
  );
}

export default function WorkoutDetailClient({
  programId,
  workoutId,
}: {
  programId: string;
  workoutId: string;
}) {
  const [state, setState] = useState<{
    status: "loading" | "ready" | "error";
    error: string | null;
    data: NormalizedWorkoutDetail | null;
  }>({ status: "loading", error: null, data: null });

  const endpoint = useMemo(() => {
    return `/api/programs/${programId}/training/workouts/${workoutId}`;
  }, [programId, workoutId]);

  async function load() {
    setState((s) => ({ ...s, status: "loading", error: null }));

    try {
      const res = await fetch(endpoint, {
        method: "GET",
        headers: { "content-type": "application/json" },
        cache: "no-store",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${text}`);
      }

      const raw = (await res.json()) as unknown;
      const normalized = normalizeWorkoutDetailResponse(raw);

      if (!normalized.ok) {
        throw new Error(normalized.error?.message ?? "Failed to load workout.");
      }

      setState({ status: "ready", error: null, data: normalized.data });
    } catch (e: any) {
      setState({ status: "error", error: e?.message ?? "Failed to load workout.", data: null });
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  const workout = state.data?.workout ?? null;
  const steps = state.data?.steps ?? [];
  const badge = workout?.is_system_template ? "Global" : "Program";

  return (
    <div className="space-y-4">
      <div className="panel p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold leading-tight truncate">{workout?.label ?? "Workout"}</h1>
              <span className={badgeVariantClass(workout?.is_system_template ? "secondary" : "brand")}>
                {badge}
              </span>
            </div>
            {workout?.description ? (
              <p className="mt-1 text-sm text-muted-foreground">{workout.description}</p>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <button type="button" className="btn btn-secondary" onClick={load} disabled={state.status === "loading"}>
              Refresh
            </button>
          </div>
        </div>
      </div>

      {state.status === "loading" ? (
        <div className="panel p-4">
          <p className="text-sm text-muted-foreground">Loading workout…</p>
        </div>
      ) : state.status === "error" ? (
        <div className="panel p-4">
          <p className="text-sm text-danger">{state.error}</p>
        </div>
      ) : !workout ? (
        <div className="mt-3 panel p-3">
          <p className="text-sm text-muted-foreground">Workout not found.</p>
        </div>
      ) : (
        <div className="panel p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Steps</h2>
            <span className="text-xs text-muted-foreground">{steps.length} total</span>
          </div>

          {steps.length === 0 ? (
            <div className="mt-3 panel p-3">
              <p className="text-sm text-muted-foreground">No steps yet.</p>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {steps.map((s) => {
                const rawParams =
                  (s as any).params ??
                  (s as any).parameters_override ??
                  (s as any).parametersOverride ??
                  null;

                const rawExerciseLabel =
                  typeof (s as any)?.exercise?.label === "string" ? (s as any).exercise.label : null;

                const exerciseLabel =
                  rawExerciseLabel &&
                  s.label &&
                  rawExerciseLabel.toLowerCase() !== s.label.toLowerCase()
                    ? rawExerciseLabel
                    : null;

                let paramsEntries = paramsToEntries(rawParams);
                const paramsPreview = safeJsonPreview(rawParams);

                // If params exist but don't flatten cleanly, render a single chip.
                if (rawParams != null && paramsEntries.length === 0) {
                  if (paramsPreview) paramsEntries = [["Params", paramsPreview]];
                }

                return (
                  <div key={s.id} className="panel p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-start gap-2">
                          <span className={badgeVariantClass("secondary")}>{s.step_index}</span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{s.label ?? "Step"}</p>
                            {exerciseLabel ? (
                              <p className="mt-0.5 text-xs text-muted-foreground truncate">{exerciseLabel}</p>
                            ) : null}
                          </div>
                        </div>

                        {paramsEntries.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {paramsEntries.map(([k, v], idx) => (
                              <span
                                key={`${k}-${idx}`}
                                className={badgeVariantClass("secondary")}
                                title={`${k}: ${v}`}
                              >
                                <span className="font-medium">{k}</span>: {v}
                              </span>
                            ))}
                          </div>
                        ) : paramsPreview ? (
                          <p className="mt-2 text-xs text-muted-foreground">Params: {paramsPreview}</p>
                        ) : (
                          <p className="mt-2 text-xs text-muted-foreground">Params: —</p>
                        )}
                      </div>

                      {/* Reserved for future actions: edit / remove / reorder */}
                      <div className="flex items-center gap-2" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}