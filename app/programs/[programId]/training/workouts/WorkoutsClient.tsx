// app/programs/[programId]/training/workouts/WorkoutsClient.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

type WorkoutRow = {
  id: string;
  program_id?: string | null;
  label: string;
  description: string | null;
  is_system_template?: boolean;
  created_at?: string;
  updated_at?: string;
  step_count?: number;
};

type WorkoutDetail = {
  workout: WorkoutRow;
  steps: Array<{
    id: string;
    stepIndex: number;
    label: string | null;
    params?: any;
    parameters_override?: any;
    parametersOverride?: any;
    exercise?: {
      id: string;
      label: string;
      programId: string | null;
      isGlobal?: boolean;
      isActive?: boolean;
      workoutCategory?: string;
      measurementUnit?: string;
      tags?: string[];
    } | null;
  }>;
};

export default function WorkoutsClient({
  programId,
  initialWorkouts = [],
}: {
  programId: string;
  initialWorkouts?: WorkoutRow[];
}) {
  const router = useRouter();

  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [workouts, setWorkouts] = React.useState<WorkoutRow[]>(initialWorkouts);

  const [detailOpen, setDetailOpen] = React.useState(false);
  const [selectedWorkoutId, setSelectedWorkoutId] = React.useState<string | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [detailError, setDetailError] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<WorkoutDetail | null>(null);

  const [editOpen, setEditOpen] = React.useState(false);
  const [editLabel, setEditLabel] = React.useState("");
  const [editDesc, setEditDesc] = React.useState("");
  const [savingEdit, setSavingEdit] = React.useState(false);
  const [editSteps, setEditSteps] = React.useState<
    Array<{
      id: string;
      stepIndex: number;
      label: string | null;
      params: any;
      exerciseLabel: string;
    }>
  >([]);
  const [stepEditError, setStepEditError] = React.useState<string | null>(null);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [newLabel, setNewLabel] = React.useState("");
  const [newDesc, setNewDesc] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  async function load(nextQ?: string) {
    setError(null);
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      const query = (typeof nextQ === "string" ? nextQ : q).trim();
      if (query) sp.set("q", query);
      sp.set("limit", "100");

      const res = await fetch(`/api/programs/${programId}/training/workouts?${sp.toString()}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${text || ""}`.trim());
      }

      const json = (await res.json()) as { workouts?: WorkoutRow[] };
      setWorkouts(json.workouts ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load workouts");
    } finally {
      setLoading(false);
    }
  }

  // Initial load (and when program changes)
  React.useEffect(() => {
    // If the server didn't provide initial workouts, fetch them.
    // (Even if it did, this keeps the client consistent after navigation.)
    void load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId]);

  async function refresh() {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  async function createWorkout() {
    const label = newLabel.trim();
    if (!label) return;

    setCreating(true);
    setError(null);
    try {
      const res = await fetch(`/api/programs/${programId}/training/workouts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label,
          description: newDesc.trim() ? newDesc.trim() : null,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${text || ""}`.trim());
      }

      setCreateOpen(false);
      setNewLabel("");
      setNewDesc("");
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Failed to create workout");
    } finally {
      setCreating(false);
    }
  }

  function closeDetail() {
    setDetailOpen(false);
    setSelectedWorkoutId(null);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(false);
    setEditOpen(false);
  }

  async function openDetail(id: string) {
    setSelectedWorkoutId(id);
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setDetail(null);

    try {
      const res = await fetch(`/api/programs/${programId}/training/workouts/${id}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${text || ""}`.trim());
      }

      const json = (await res.json()) as any;

      // Normalize to a single shape the client can rely on
      const workout = normalizeWorkout(json.workout ?? json.data?.workout ?? json);
      const stepsRaw: any[] = json.steps ?? json.data?.steps ?? [];
      const steps = stepsRaw.map((s: any) => {
        const stepIndex = s.stepIndex ?? s.step_index ?? 0;
        return {
          id: s.id,
          stepIndex,
          label: s.label ?? null,
          // prefer normalized params first
          params: s.params ?? s.parameters_override ?? s.parametersOverride ?? {},
          parameters_override: s.parameters_override,
          parametersOverride: s.parametersOverride,
          exercise: s.exercise ?? null,
        };
      });

      setDetail({ workout, steps });

      // Prime editor fields
      setEditLabel(workout.label ?? "");
      setEditDesc(workout.description ?? "");

      // Prime step editor fields (program-owned only; global requires cloning first)
      setEditSteps(
        steps
          .slice()
          .sort((a, b) => (a.stepIndex ?? 0) - (b.stepIndex ?? 0))
          .map((s) => ({
            id: s.id,
            stepIndex: s.stepIndex ?? 0,
            label: s.label ?? null,
            params: s.params ?? {},
            exerciseLabel: s.exercise?.label ?? "",
          }))
      );
      setStepEditError(null);
    } catch (e: any) {
      setDetailError(e?.message ?? "Failed to load workout");
    } finally {
      setDetailLoading(false);
    }
  }

  function normalizeWorkout(raw: any): WorkoutRow {
    if (!raw) {
      return {
        id: "",
        label: "",
        description: null,
        is_system_template: false,
      };
    }

    return {
      id: raw.id,
      program_id: raw.program_id ?? raw.programId ?? null,
      label: raw.label ?? "",
      description: raw.description ?? null,
      is_system_template: Boolean(raw.is_system_template ?? raw.isSystemTemplate ?? raw.is_global ?? raw.isGlobal ?? false),
      created_at: raw.created_at ?? raw.createdAt,
      updated_at: raw.updated_at ?? raw.updatedAt,
      step_count: raw.step_count ?? raw.stepCount,
    };
  }

  function buildStepUpdatePayload() {
    // Keep this payload minimal and durable; route can ignore fields it doesn't support.
    return editSteps
      .slice()
      .sort((a, b) => (a.stepIndex ?? 0) - (b.stepIndex ?? 0))
      .map((s) => ({
        id: s.id,
        stepIndex: s.stepIndex,
        label: s.label,
        params: s.params ?? {},
      }));
  }

  function getStepParams(step: any) {
    return step?.params ?? {};
  }

  function formatParamKey(k: string) {
    return k.replace(/_/g, " ");
  }

  function formatParamValue(v: any) {
    if (v == null) return "—";
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }

  async function saveWorkoutEdits() {
    if (!detail?.workout?.id) return;
    const id = detail.workout.id;

    if (stepEditError) {
      setDetailError("Fix step parameter JSON before saving.");
      setSavingEdit(false);
      return;
    }

    setSavingEdit(true);
    setDetailError(null);
    try {
      const res = await fetch(`/api/programs/${programId}/training/workouts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: editLabel.trim(),
          description: editDesc.trim() ? editDesc.trim() : null,
          steps: buildStepUpdatePayload(),
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${text || ""}`.trim());
      }

      // Re-fetch detail so the display modal updates immediately
      await openDetail(id);

      // Also update the list row
      setWorkouts((prev) =>
        prev.map((w) =>
          w.id === id
            ? {
                ...w,
                label: editLabel.trim() || w.label,
                description: editDesc.trim() ? editDesc.trim() : null,
              }
            : w
        )
      );

      setEditOpen(false);
    } catch (e: any) {
      setDetailError(e?.message ?? "Failed to save workout");
    } finally {
      setSavingEdit(false);
    }
  }

  async function cloneGlobalWorkout() {
    if (!detail?.workout?.id) return;
    const id = detail.workout.id;

    setDetailError(null);
    try {
      const res = await fetch(`/api/programs/${programId}/training/workouts/${id}/clone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${text || ""}`.trim());
      }

      // Refresh list after cloning
      await load();

      // Close the detail modal to keep flow simple for now
      closeDetail();
    } catch (e: any) {
      setDetailError(e?.message ?? "Failed to clone workout");
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl ring-1 ring-panel panel p-3">
        <div className="flex flex-1 items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search workouts…"
            className="h-10 w-full max-w-lg rounded-md ring-1 ring-panel bg-panel-muted px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--text-subtle)] outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
          />

          <button
            onClick={() => setCreateOpen(true)}
            className="h-10 whitespace-nowrap rounded-md bg-[var(--brand-primary)] px-3 text-sm font-medium text-[var(--brand-contrast)] hover:opacity-90"
          >
            New workout
          </button>

          <button
            onClick={refresh}
            disabled={refreshing}
            className="h-10 whitespace-nowrap rounded-md ring-1 ring-panel bg-panel-muted px-3 text-sm text-[var(--foreground)] hover:bg-panel disabled:opacity-60"
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Body */}
      {error ? (
        <div className="rounded-xl ring-1 ring-[var(--danger)]/40 panel p-4 text-sm text-[var(--foreground)]">
          <div className="font-medium text-[var(--danger)]">Error</div>
          <div className="mt-1 text-[var(--muted-foreground)]">{error}</div>
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-xl ring-1 ring-panel panel p-6 text-sm text-[var(--muted-foreground)]">
          Loading workouts…
        </div>
      ) : workouts.length === 0 ? (
        <div className="rounded-xl ring-1 ring-panel panel p-6">
          <div className="text-sm font-semibold text-[var(--foreground)]">No workouts yet</div>
          <div className="mt-1 text-sm text-[var(--muted-foreground)]">
            Create your first workout to start assembling sessions.
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setCreateOpen(true)}
              className="h-10 rounded-md bg-[var(--brand-primary)] px-3 text-sm font-medium text-[var(--brand-contrast)] hover:opacity-90"
            >
              New workout
            </button>
            <button
              onClick={() => router.refresh()}
              className="h-10 rounded-md ring-1 ring-panel bg-panel-muted px-3 text-sm text-[var(--foreground)] hover:bg-panel"
            >
              Reload
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {workouts.map((w) => {
            const badge = w.is_system_template ? "Global" : "Program";
            return (
              <div
                key={w.id}
                role="button"
                tabIndex={0}
                onClick={() => void openDetail(w.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    void openDetail(w.id);
                  }
                }}
                className="group cursor-pointer select-none text-left rounded-xl ring-1 ring-panel panel p-4 hover:opacity-95"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-[var(--foreground)]">
                      {w.label}
                    </div>
                    <div className="mt-1 line-clamp-2 text-sm text-[var(--muted-foreground)]">
                      {w.description || "—"}
                    </div>
                  </div>

                  <span
                    className={
                      w.is_system_template
                        ? "inline-flex shrink-0 items-center rounded-full ring-1 ring-panel bg-[var(--brand-secondary)]/35 px-2 py-0.5 text-[11px] font-medium text-[var(--foreground)]"
                        : "inline-flex shrink-0 items-center rounded-full ring-1 ring-panel bg-[var(--brand-primary)]/15 px-2 py-0.5 text-[11px] font-medium text-[var(--foreground)]"
                    }
                  >
                    {badge}
                  </span>
                </div>

                <div className="mt-3 flex items-end justify-between gap-3">
                  <div className="text-xs text-[var(--muted-foreground)]">
                    {typeof w.step_count === "number" ? `${w.step_count} steps` : "—"}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      // Keep the whole card clickable, but make the action look/feel like a button.
                      e.preventDefault();
                      e.stopPropagation();
                      void openDetail(w.id);
                    }}
                    className="h-8 whitespace-nowrap rounded-md ring-1 ring-panel bg-panel-muted px-2 text-xs font-medium text-[var(--foreground)] hover:bg-panel"
                    aria-label={`Open workout ${w.label}`}
                    title="Open"
                  >
                    Open
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      {createOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl ring-1 ring-panel panel p-4 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[var(--foreground)]">New workout</div>
                <div className="text-sm text-[var(--muted-foreground)]">
                  Workouts are quantified collections of exercises.
                </div>
              </div>
              <button
                onClick={() => setCreateOpen(false)}
                className="rounded-md ring-1 ring-panel bg-panel-muted px-2 py-1 text-sm text-[var(--foreground)] hover:bg-panel"
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <div className="mb-1 text-xs font-medium text-[var(--muted-foreground)]">Label</div>
                <input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="e.g. 8x400 @ 1k pace"
                  className="h-10 w-full rounded-md ring-1 ring-panel bg-panel-muted px-3 text-sm text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                />
              </div>

              <div>
                <div className="mb-1 text-xs font-medium text-[var(--muted-foreground)]">
                  Description (optional)
                </div>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Any notes about intent, progression, or constraints…"
                  className="min-h-[88px] w-full rounded-md ring-1 ring-panel bg-panel-muted px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setCreateOpen(false)}
                  className="h-10 rounded-md ring-1 ring-panel bg-panel-muted px-3 text-sm text-[var(--foreground)] hover:bg-panel"
                >
                  Cancel
                </button>
                <button
                  onClick={createWorkout}
                  disabled={creating || !newLabel.trim()}
                  className="h-10 rounded-md bg-[var(--brand-primary)] px-3 text-sm font-medium text-[var(--brand-contrast)] hover:opacity-90 disabled:opacity-60"
                >
                  {creating ? "Creating…" : "Create workout"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Workout detail modal (selection / preview) */}
      {detailOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-3xl rounded-2xl ring-1 ring-panel panel shadow-xl">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-[var(--panel-border)] p-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="truncate text-sm font-semibold text-[var(--foreground)]">
                    {detail?.workout?.label ?? "Workout"}
                  </div>
                  {detail?.workout ? (
                    <span
                      className={
                        Boolean(detail.workout.is_system_template)
                          ? "inline-flex items-center rounded-full ring-1 ring-panel bg-[var(--brand-secondary)]/35 px-2 py-0.5 text-[11px] font-medium text-[var(--foreground)]"
                          : "inline-flex items-center rounded-full ring-1 ring-panel bg-[var(--brand-primary)]/15 px-2 py-0.5 text-[11px] font-medium text-[var(--foreground)]"
                      }
                    >
                      {Boolean(detail.workout.is_system_template) ? "Global" : "Program"}
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 text-sm text-[var(--muted-foreground)]">
                  {detail?.workout?.description ?? "—"}
                </div>
              </div>

              <button
                type="button"
                onClick={closeDetail}
                className="shrink-0 rounded-md ring-1 ring-panel bg-panel-muted px-2 py-1 text-sm text-[var(--foreground)] hover:bg-panel"
              >
                Close
              </button>
            </div>

            {/* Body */}
            <div className="p-4">
              {detailError ? (
                <div className="mb-3 rounded-xl ring-1 ring-[var(--danger)]/40 panel p-3 text-sm">
                  <div className="font-medium text-[var(--danger)]">Error</div>
                  <div className="mt-1 text-[var(--muted-foreground)]">{detailError}</div>
                </div>
              ) : null}

              {detailLoading ? (
                <div className="rounded-xl ring-1 ring-panel panel p-6 text-sm text-[var(--muted-foreground)]">
                  Loading workout…
                </div>
              ) : !detail ? (
                <div className="rounded-xl ring-1 ring-panel panel p-6 text-sm text-[var(--muted-foreground)]">
                  Select a workout to preview.
                </div>
              ) : (
                <div className="max-h-[60vh] overflow-auto rounded-xl ring-1 ring-panel bg-panel-muted p-3">
                  <div className="space-y-2">
                    {detail.steps?.length ? (
                      detail.steps
                        .slice()
                        .sort((a, b) => (a.stepIndex ?? 0) - (b.stepIndex ?? 0))
                        .map((s) => {
                          const params = getStepParams(s);
                          const paramEntries = Object.entries(params ?? {});
                          return (
                            <div key={s.id} className="rounded-xl ring-1 ring-panel panel p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-xs text-[var(--muted-foreground)]">Step {s.stepIndex}</div>
                                  <div className="mt-0.5 text-sm font-semibold text-[var(--foreground)]">
                                    {s.label || s.exercise?.label || "—"}
                                  </div>
                                  {s.exercise?.label ? (
                                    <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                                      Exercise: {s.exercise.label}
                                    </div>
                                  ) : null}
                                </div>
                              </div>

                              {paramEntries.length ? (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {paramEntries.map(([k, v]) => (
                                    <span
                                      key={k}
                                      className="inline-flex items-center rounded-full ring-1 ring-panel bg-panel-muted px-2 py-0.5 text-[11px] font-medium text-[var(--foreground)]"
                                      title={`${k}: ${formatParamValue(v)}`}
                                    >
                                      {formatParamKey(k)}: {formatParamValue(v)}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <div className="mt-2 text-xs text-[var(--muted-foreground)]">No parameters</div>
                              )}
                            </div>
                          );
                        })
                    ) : (
                      <div className="rounded-xl ring-1 ring-panel panel p-4 text-sm text-[var(--muted-foreground)]">
                        No steps defined yet.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--panel-border)] p-4">
              <div className="text-xs text-[var(--muted-foreground)]">
                {detail?.steps?.length ? `${detail.steps.length} steps` : ""}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {Boolean(detail?.workout?.is_system_template) ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void cloneGlobalWorkout()}
                      className="h-10 rounded-md bg-[var(--brand-primary)] px-3 text-sm font-medium text-[var(--brand-contrast)] hover:opacity-90"
                      title="Clone to program workouts for customization"
                    >
                      Clone to program
                    </button>
                    <span className="hidden sm:inline text-xs text-[var(--muted-foreground)]">
                      Clone to edit steps.
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditOpen(true)}
                    className="h-10 rounded-md ring-1 ring-panel bg-panel-muted px-3 text-sm font-medium text-[var(--foreground)] hover:bg-panel"
                    title="Edit workout"
                  >
                    Edit
                  </button>
                )}

                <button
                  type="button"
                  onClick={closeDetail}
                  className="h-10 rounded-md ring-1 ring-panel bg-panel-muted px-3 text-sm text-[var(--foreground)] hover:bg-panel"
                >
                  Done
                </button>
              </div>
            </div>

            {/* Edit modal layered over detail */}
            {editOpen && detail?.workout && !Boolean(detail.workout.is_system_template) ? (
              <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
                <div className="w-full max-w-lg rounded-2xl ring-1 ring-panel panel p-4 shadow-xl">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[var(--foreground)]">Edit workout</div>
                      <div className="text-sm text-[var(--muted-foreground)]">Update label and description.</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditOpen(false)}
                      className="rounded-md ring-1 ring-panel bg-panel-muted px-2 py-1 text-sm text-[var(--foreground)] hover:bg-panel"
                    >
                      Close
                    </button>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div>
                      <div className="mb-1 text-xs font-medium text-[var(--muted-foreground)]">Label</div>
                      <input
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        className="h-10 w-full rounded-md ring-1 ring-panel bg-panel-muted px-3 text-sm text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                      />
                    </div>

                    <div>
                      <div className="mb-1 text-xs font-medium text-[var(--muted-foreground)]">Description</div>
                      <textarea
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        className="min-h-[88px] w-full rounded-md ring-1 ring-panel bg-panel-muted px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                      />
                    </div>

                    <div>
                      <div className="mb-1 text-xs font-medium text-[var(--muted-foreground)]">Steps</div>

                      {stepEditError ? (
                        <div className="mb-2 rounded-lg ring-1 ring-[var(--danger)]/40 panel p-2 text-xs">
                          <div className="font-medium text-[var(--danger)]">Step edit error</div>
                          <div className="mt-0.5 text-[var(--muted-foreground)]">{stepEditError}</div>
                        </div>
                      ) : null}

                      <div className="space-y-2">
                        {editSteps
                          .slice()
                          .sort((a, b) => (a.stepIndex ?? 0) - (b.stepIndex ?? 0))
                          .map((s, idx) => (
                            <div key={s.id} className="rounded-xl ring-1 ring-panel panel p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-xs text-[var(--muted-foreground)]">Step {s.stepIndex}</div>
                                  {s.exerciseLabel ? (
                                    <div className="mt-0.5 text-xs text-[var(--muted-foreground)]">Exercise: {s.exerciseLabel}</div>
                                  ) : null}
                                </div>
                              </div>

                              <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                                <div className="md:col-span-1">
                                  <div className="mb-1 text-xs font-medium text-[var(--muted-foreground)]">Label</div>
                                  <input
                                    value={s.label ?? ""}
                                    onChange={(e) => {
                                      const next = e.target.value;
                                      setEditSteps((prev) =>
                                        prev.map((p) => (p.id === s.id ? { ...p, label: next ? next : null } : p))
                                      );
                                    }}
                                    placeholder={s.exerciseLabel ? s.exerciseLabel : "Step label"}
                                    className="h-9 w-full rounded-md ring-1 ring-panel bg-panel-muted px-3 text-sm text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                                  />
                                </div>

                                <div className="md:col-span-2">
                                  <div className="mb-1 flex items-center justify-between">
                                    <div className="text-xs font-medium text-[var(--muted-foreground)]">Parameters (JSON)</div>
                                    <div className="text-[11px] text-[var(--muted-foreground)]">Edit carefully — saved as JSON.</div>
                                  </div>
                                  <textarea
                                    value={(() => {
                                      try {
                                        return JSON.stringify(s.params ?? {}, null, 2);
                                      } catch {
                                        return "{}";
                                      }
                                    })()}
                                    onChange={(e) => {
                                      const raw = e.target.value;
                                      // Try to parse live; if invalid, keep text in place by storing as a string marker
                                      try {
                                        const parsed = raw.trim() ? JSON.parse(raw) : {};
                                        setStepEditError(null);
                                        setEditSteps((prev) =>
                                          prev.map((p) => (p.id === s.id ? { ...p, params: parsed } : p))
                                        );
                                      } catch {
                                        setStepEditError(`Invalid JSON in step ${s.stepIndex}.`);
                                      }
                                    }}
                                    className="min-h-[84px] w-full rounded-md ring-1 ring-panel bg-panel-muted px-3 py-2 font-mono text-[12px] text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setEditOpen(false)}
                        className="h-10 rounded-md ring-1 ring-panel bg-panel-muted px-3 text-sm text-[var(--foreground)] hover:bg-panel"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void saveWorkoutEdits()}
                        disabled={savingEdit || !editLabel.trim()}
                        className="h-10 rounded-md bg-[var(--brand-primary)] px-3 text-sm font-medium text-[var(--brand-contrast)] hover:opacity-90 disabled:opacity-60"
                      >
                        {savingEdit ? "Saving…" : "Save"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}