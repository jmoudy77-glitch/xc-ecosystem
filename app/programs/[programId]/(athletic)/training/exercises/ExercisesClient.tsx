// app/programs/[programId]/training/exercises/ExercisesClient.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type TrainingExercise = {
  id: string;
  program_id: string | null;
  label: string;
  description: string | null;
  workout_category: "run" | "gym" | "cross_training" | "other";
  measurement_unit: "meters" | "seconds" | "reps" | "mixed" | "none";
  tags: string[] | null;
  metadata: Record<string, any> | null;
  is_active: boolean;
};

type ScopeFilter = "all" | "system" | "program";

type EditorState = {
  open: boolean;
  mode: "create" | "edit";
  target?: TrainingExercise;
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function ExercisesClient({ programId }: { programId: string }) {
  const router = useRouter();

  const [scope, setScope] = useState<ScopeFilter>("all");
  const [q, setQ] = useState("");
  const [onlyActive, setOnlyActive] = useState(true);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exercises, setExercises] = useState<TrainingExercise[]>([]);

  const [editor, setEditor] = useState<EditorState>({ open: false, mode: "create" });
  const [saving, setSaving] = useState(false);
  const [cloningId, setCloningId] = useState<string | null>(null);
  const cloneToProgram = async (ex: TrainingExercise) => {
    // Only system exercises (global) can be cloned
    if (!isSystemExercise(ex)) return;

    setError(null);
    setCloningId(ex.id);

    try {
      const res = await fetch(
        `/api/programs/${programId}/training/exercises/${ex.id}/clone`,
        { method: "POST" },
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${text}`);
      }

      const json = (await res.json()) as { exercise?: TrainingExercise };
      const created = json.exercise;

      // Optimistically add the cloned program exercise so the coach sees it immediately.
      if (created) {
        setExercises((prev) => {
          // Avoid duplicates if we already have it from a refresh
          if (prev.some((x) => x.id === created.id)) return prev;
          return [created, ...prev];
        });
      }

      await load();
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "Clone failed");
    } finally {
      setCloningId(null);
    }
  };

  const [formLabel, setFormLabel] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState<TrainingExercise["workout_category"]>("run");
  const [formUnit, setFormUnit] = useState<TrainingExercise["measurement_unit"]>("meters");
  const [formTags, setFormTags] = useState("");

  type ParamKey =
    | "reps"
    | "distance_m"
    | "duration_sec"
    | "rest_sec"
    | "load"
    | "incline"
    | "intensity"
    | "target_pace";

  const PARAM_LABELS: Record<ParamKey, string> = {
    reps: "Reps",
    distance_m: "Distance (m)",
    duration_sec: "Duration (sec)",
    rest_sec: "Rest (sec)",
    load: "Load / weight",
    incline: "Incline",
    intensity: "Intensity",
    target_pace: "Target pace",
  };

  type ParamSchemaItem = { key: ParamKey; required?: boolean };

  const [paramSchema, setParamSchema] = useState<ParamSchemaItem[]>([
    { key: "reps" },
    { key: "distance_m", required: true },
    { key: "rest_sec" },
  ]);

  const hasParam = (k: ParamKey) => paramSchema.some((p) => p.key === k);

  const addParam = (k: ParamKey) => {
    setParamSchema((prev) => (prev.some((p) => p.key === k) ? prev : [...prev, { key: k }]));
  };

  const removeParam = (k: ParamKey) => {
    setParamSchema((prev) => prev.filter((p) => p.key !== k));
  };

  const toggleRequired = (k: ParamKey) => {
    setParamSchema((prev) =>
      prev.map((p) => (p.key === k ? { ...p, required: !p.required } : p)),
    );
  };

  const moveParam = (from: number, to: number) => {
    setParamSchema((prev) => {
      if (from < 0 || to < 0 || from >= prev.length || to >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const canEdit = useCallback(
    (ex: TrainingExercise) => Boolean(ex.program_id) && ex.program_id === programId,
    [programId],
  );

  const isSystemExercise = useCallback((ex: TrainingExercise) => {
    // Primary source of truth: system exercises are global (no program_id)
    if (ex.program_id === null) return true;
    // Defensive: allow the API to explicitly mark system scope in metadata
    const meta: any = ex.metadata ?? {};
    if (meta?.scope === "system" || meta?.is_system === true) return true;
    return false;
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return exercises.filter((ex) => {
      if (scope === "system" && ex.program_id !== null) return false;
      if (scope === "program" && ex.program_id === null) return false;
      if (onlyActive && !ex.is_active) return false;
      if (!needle) return true;
      const hay = `${ex.label} ${(ex.description ?? "")} ${(ex.tags ?? []).join(" ")}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [exercises, q, scope, onlyActive]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const sp = new URLSearchParams();
      sp.set("scope", scope);
      sp.set("active", onlyActive ? "true" : "false");
      if (q.trim()) sp.set("q", q.trim());

      const res = await fetch(`/api/programs/${programId}/training/exercises?${sp.toString()}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${text}`);
      }

      const json = (await res.json()) as { exercises?: TrainingExercise[] };
      setExercises(json.exercises ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load exercises");
    } finally {
      setLoading(false);
    }
  }, [programId, scope, onlyActive, q]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditor({ open: true, mode: "create" });
    setFormLabel("");
    setFormDescription("");
    setFormCategory("run");
    setFormUnit("meters");
    setFormTags("");
    setParamSchema([{ key: "reps" }, { key: "distance_m", required: true }, { key: "rest_sec" }]);
  };

  const openEdit = (ex: TrainingExercise) => {
    setEditor({ open: true, mode: "edit", target: ex });
    setFormLabel(ex.label ?? "");
    setFormDescription(ex.description ?? "");
    setFormCategory(ex.workout_category);
    setFormUnit(ex.measurement_unit);
    setFormTags((ex.tags ?? []).join(", "));

    const meta: any = ex.metadata ?? {};
    const schema = meta?.parameter_schema;

    if (Array.isArray(schema) && schema.length) {
      // Back-compat: old format was ParamKey[]
      const first = schema[0] as any;

      if (typeof first === "string") {
        setParamSchema((schema as any[]).map((k) => ({ key: k as ParamKey })));
      } else {
        // New format: { key, required }[]
        setParamSchema(
          (schema as any[]).map((p) => ({
            key: p?.key as ParamKey,
            required: Boolean(p?.required),
          })),
        );
      }
    } else {
      setParamSchema([{ key: "reps" }, { key: "distance_m", required: true }, { key: "rest_sec" }]);
    }
  };

  const closeEditor = () => setEditor({ open: false, mode: "create" });

  const upsertExercise = async () => {
    const label = formLabel.trim();
    if (!label) {
      setError("Label is required");
      return;
    }
    if (!paramSchema.length) {
      setError("Select at least one usage field");
      return;
    }

    const tags = formTags.split(",").map((t) => t.trim()).filter(Boolean);

    setSaving(true);
    setError(null);

    try {
      const metadata = {
        parameter_schema: paramSchema,
      };

      if (editor.mode === "create") {
        await fetch(`/api/programs/${programId}/training/exercises`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label,
            description: formDescription || null,
            workoutCategory: formCategory,
            measurementUnit: formUnit,
            tags,
            metadata,
          }),
        });
      } else if (editor.target) {
        await fetch(`/api/programs/${programId}/training/exercises/${editor.target.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label,
            description: formDescription || null,
            workoutCategory: formCategory,
            measurementUnit: formUnit,
            tags,
            metadata,
          }),
        });
      }

      closeEditor();
      await load();
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (ex: TrainingExercise) => {
    if (!canEdit(ex)) return;

    try {
      await fetch(`/api/programs/${programId}/training/exercises/${ex.id}`, { method: "DELETE" });
      await load();
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "Deactivate failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold">Exercise library</p>
          <p className="text-[11px] text-muted-foreground">
            Exercises are the foundation. Workouts and practices build from them.
          </p>
        </div>
        <button onClick={openCreate} className="rounded-full px-3 py-1.5 text-[11px] ring-1">
          New exercise
        </button>
      </div>

      <div className="rounded-xl p-3 ring-1 ring-panel panel-muted">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-[11px] font-semibold">Filters</div>

            <div className="ml-1 inline-flex overflow-hidden rounded-full ring-1 ring-panel">
              <button
                type="button"
                onClick={() => setScope("all")}
                className={cx(
                  "px-2.5 py-1 text-[11px]",
                  scope === "all" && "bg-[var(--brand-soft)]",
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setScope("program")}
                className={cx(
                  "px-2.5 py-1 text-[11px]",
                  scope === "program" && "bg-[var(--brand-soft)]",
                )}
              >
                Program
              </button>
              <button
                type="button"
                onClick={() => setScope("system")}
                className={cx(
                  "px-2.5 py-1 text-[11px]",
                  scope === "system" && "bg-[var(--brand-soft)]",
                )}
              >
                Global
              </button>
            </div>

            <label className="ml-1 inline-flex items-center gap-2 text-[11px]">
              <input
                type="checkbox"
                checked={onlyActive}
                onChange={(e) => setOnlyActive(e.target.checked)}
                className="h-3.5 w-3.5"
              />
              Active only
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search exercises…"
              className="w-full sm:w-[260px] rounded-full bg-transparent px-3 py-1.5 text-[11px] ring-1 ring-panel focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                setQ("");
                setScope("all");
                setOnlyActive(true);
              }}
              className="rounded-full px-3 py-1.5 text-[11px] ring-1 ring-panel"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map((ex) => (
          <div key={ex.id} className="rounded-lg p-3 ring-1 ring-panel panel-muted">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold">{ex.label}</div>
                <div className="text-[11px] text-muted-foreground">
                  {ex.workout_category} • {ex.measurement_unit}
                </div>
                {ex.description ? (
                  <div className="mt-1 text-[11px] text-muted-foreground">{ex.description}</div>
                ) : null}
                {(ex.tags ?? []).length ? (
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    Tags: {(ex.tags ?? []).join(", ")}
                  </div>
                ) : null}
              </div>
              <div className="shrink-0 flex flex-col items-end justify-between self-stretch">
                <span
                  className={cx(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide ring-1 ring-panel",
                    isSystemExercise(ex)
                      ? "bg-[var(--brand-secondary)]/40 text-foreground"
                      : "bg-[var(--brand-soft)] text-foreground",
                  )}
                >
                  {isSystemExercise(ex) ? "GLOBAL" : "PROGRAM"}
                </span>

                <div className="mt-2 flex items-center justify-end gap-2">
                  {isSystemExercise(ex) ? (
                    <button
                      type="button"
                      onClick={() => cloneToProgram(ex)}
                      disabled={cloningId === ex.id}
                      className={cx(
                        "rounded-full px-3 py-1 text-[11px] font-semibold ring-1 ring-panel cursor-pointer",
                        "bg-transparent hover:bg-[var(--brand-soft)] transition-colors",
                        cloningId === ex.id && "opacity-70 cursor-default",
                      )}
                      title="Clone to Program for customization"
                    >
                      {cloningId === ex.id ? "Cloning…" : "Clone"}
                    </button>
                  ) : null}

                  {!isSystemExercise(ex) && canEdit(ex) ? (
                    <>
                      <button
                        onClick={() => openEdit(ex)}
                        className="rounded-full px-3 py-1 text-[11px] ring-1 ring-panel"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deactivate(ex)}
                        className="rounded-full px-3 py-1 text-[11px] ring-1 ring-panel"
                      >
                        Deactivate
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editor.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-xl p-4 ring-1 ring-panel panel">
            <div className="text-xs font-semibold mb-2">
              {editor.mode === "create" ? "New exercise" : "Edit exercise"}
            </div>
            <div className="grid gap-3">
              <div className="grid gap-1">
                <div className="text-[11px] text-muted-foreground">Label</div>
                <input
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  placeholder="e.g., 400m run"
                  className="w-full rounded-md bg-transparent px-3 py-2 text-xs ring-1 ring-panel focus:outline-none"
                />
              </div>

              <div className="grid gap-1">
                <div className="text-[11px] text-muted-foreground">Description</div>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Optional notes for coaches"
                  className="min-h-[88px] w-full resize-y rounded-md bg-transparent px-3 py-2 text-xs ring-1 ring-panel focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="grid gap-1">
                  <div className="text-[11px] text-muted-foreground">Category</div>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as TrainingExercise["workout_category"])}
                    className="w-full rounded-md bg-transparent px-3 py-2 text-xs ring-1 ring-panel focus:outline-none"
                  >
                    <option value="run">Run</option>
                    <option value="gym">Gym</option>
                    <option value="cross_training">Cross training</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="grid gap-1">
                  <div className="text-[11px] text-muted-foreground">Measurement unit</div>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value as TrainingExercise["measurement_unit"])}
                    className="w-full rounded-md bg-transparent px-3 py-2 text-xs ring-1 ring-panel focus:outline-none"
                  >
                    <option value="meters">Meters</option>
                    <option value="seconds">Seconds</option>
                    <option value="reps">Reps</option>
                    <option value="mixed">Mixed</option>
                    <option value="none">None</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-1">
                <div className="text-[11px] text-muted-foreground">Tags</div>
                <input
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  placeholder="e.g., tempo, aerobic, threshold"
                  className="w-full rounded-md bg-transparent px-3 py-2 text-xs ring-1 ring-panel focus:outline-none"
                />
                <div className="text-[10px] text-muted-foreground">Comma-separated.</div>
              </div>

              <div className="rounded-lg ring-1 ring-panel panel-muted p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[11px] font-semibold">Exercise usage model</div>
                    <div className="text-[10px] text-muted-foreground">
                      Select which measurable fields this exercise supports when used inside a workout. Notes and intensity are always available at the workout step level.
                    </div>
                  </div>
                </div>

                <div className="mt-2 grid gap-3">
                  <div>
                    <div className="text-[11px] font-semibold">Selected fields</div>
                    <div className="mt-2 space-y-2">
                      {paramSchema.map((p, idx) => (
                        <div
                          key={p.key}
                          className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 ring-1 ring-panel bg-[var(--surface-1)]/20"
                        >
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold">{PARAM_LABELS[p.key]}</div>
                            <div className="text-[10px] text-muted-foreground">
                              Used when this exercise is added to a workout.
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <label className="inline-flex items-center gap-2 text-[11px]">
                              <input
                                type="checkbox"
                                checked={Boolean(p.required)}
                                onChange={() => toggleRequired(p.key)}
                                className="h-3.5 w-3.5"
                              />
                              Required
                            </label>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => moveParam(idx, idx - 1)}
                                disabled={idx === 0}
                                className={cx(
                                  "rounded-md px-2 py-1 text-[11px] ring-1 ring-panel",
                                  idx === 0 && "opacity-50 cursor-not-allowed",
                                )}
                                title="Move up"
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                onClick={() => moveParam(idx, idx + 1)}
                                disabled={idx === paramSchema.length - 1}
                                className={cx(
                                  "rounded-md px-2 py-1 text-[11px] ring-1 ring-panel",
                                  idx === paramSchema.length - 1 && "opacity-50 cursor-not-allowed",
                                )}
                                title="Move down"
                              >
                                ↓
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeParam(p.key)}
                              className="rounded-md px-2 py-1 text-[11px] ring-1 ring-panel"
                              title="Remove"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}

                      {!paramSchema.length ? (
                        <div className="text-[11px] text-muted-foreground">
                          No fields selected yet.
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-semibold">Add fields</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(Object.keys(PARAM_LABELS) as ParamKey[]).map((k) => {
                        const active = hasParam(k);
                        return (
                          <button
                            key={k}
                            type="button"
                            onClick={() => (active ? removeParam(k) : addParam(k))}
                            className={cx(
                              "rounded-full px-3 py-1 text-[11px] ring-1 ring-panel",
                              active ? "bg-[var(--brand-soft)]" : "bg-transparent",
                            )}
                            aria-pressed={active}
                            title={active ? "Remove" : "Add"}
                          >
                            {PARAM_LABELS[k]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeEditor}
                className="rounded-full px-3 py-1.5 text-[11px] ring-1 ring-panel hover:bg-panel-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={upsertExercise}
                className={cx(
                  "rounded-full px-3 py-1.5 text-[11px] ring-1 ring-panel",
                  saving ? "opacity-70" : "bg-[var(--brand-soft)] hover:bg-[var(--brand-soft)]",
                )}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}