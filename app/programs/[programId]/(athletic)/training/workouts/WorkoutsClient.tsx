// /Users/joshmoudy/Library/CloudStorage/GoogleDrive-jmoudy77@gmail.com/My Drive/Ecosystem_Live/xc-ecosystem/app/programs/[programId]/training/workouts/WorkoutsClient.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

type WorkoutRow = {
  id: string;
  program_id?: string | null;
  label: string;
  description: string | null;
  is_system_template?: boolean;
  archived_at?: string | null;
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

  const editStepsScrollRef = React.useRef<HTMLDivElement | null>(null);
  const [addStepChooserOpen, setAddStepChooserOpen] = React.useState(false);

  const [exercisePanelOpen, setExercisePanelOpen] = React.useState(false);
  const [exerciseQ, setExerciseQ] = React.useState("");
  const [exerciseLoading, setExerciseLoading] = React.useState(false);
  const [exerciseError, setExerciseError] = React.useState<string | null>(null);
  const [exercises, setExercises] = React.useState<Array<{ id: string; label: string; description?: string | null }>>([]);

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
      exerciseId: string | null;
    }>
  >([]);
  const [stepEditError, setStepEditError] = React.useState<string | null>(null);

  const [dragStepId, setDragStepId] = React.useState<string | null>(null);
  const [dragOverStepId, setDragOverStepId] = React.useState<string | null>(null);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [newLabel, setNewLabel] = React.useState("");
  const [newDesc, setNewDesc] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  type DuplicateGroup = {
    signature: string;
    items: Array<{
      id: string;
      label: string;
      description: string | null;
      archived_at: string | null;
      updated_at?: string;
      created_at?: string;
      step_count?: number;
    }>;
  };

  const [dupesOpen, setDupesOpen] = React.useState(false);
  const [dupesLoading, setDupesLoading] = React.useState(false);
  const [dupesError, setDupesError] = React.useState<string | null>(null);
  const [dupeGroups, setDupeGroups] = React.useState<DuplicateGroup[]>([]);
  const [keepBySig, setKeepBySig] = React.useState<Record<string, string>>({});
  const [archivingDupes, setArchivingDupes] = React.useState(false);

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
    void checkDuplicatesHint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId]);

  React.useEffect(() => {
    const t = setTimeout(() => {
      void load(q);
    }, 250);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  React.useEffect(() => {
    if (!exercisePanelOpen) return;
    const t = setTimeout(() => void loadExercises(exerciseQ), 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseQ, exercisePanelOpen]);

  async function refresh() {
    setRefreshing(true);
    try {
      await load();
      await checkDuplicatesHint();
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
    resetEditorTransientUI();
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
            exerciseId: s.exercise?.id ?? null,
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
      archived_at: raw.archived_at ?? raw.archivedAt ?? null,
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
      .map((s) => {
        const isNew = String(s.id ?? "").startsWith("new_");
        return {
          ...(isNew ? {} : { id: s.id }),
          stepIndex: s.stepIndex,
          label: s.label,
          exerciseId: s.exerciseId ?? null,
          params: s.params ?? {},
        };
      });
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

  function buildCoachFacingParamSpec(params: any) {
    // Returns a list of key/value pairs suitable for simple form controls.
    // Unknown shapes fall back to JSON editor only.
    if (!params || typeof params !== "object" || Array.isArray(params)) {
      return { mode: "json" as const, fields: [] as Array<{ key: string; label: string; type: "number" | "text" | "toggle"; value: any }> };
    }

    const knownKeys = [
      "reps",
      "sets",
      "distance_m",
      "distance",
      "duration_sec",
      "duration",
      "rest_sec",
      "rest",
      "pace",
      "rpe",
      "intensity",
      "notes",
    ];

    const keys = Object.keys(params);
    const usesKnown = keys.some((k) => knownKeys.includes(k));

    if (!usesKnown) {
      return { mode: "json" as const, fields: [] as Array<{ key: string; label: string; type: "number" | "text" | "toggle"; value: any }> };
    }

    const fields: Array<{ key: string; label: string; type: "number" | "text" | "toggle"; value: any }> = [];

    const pushIfPresent = (key: string, label: string, type: "number" | "text" | "toggle") => {
      if (params[key] === undefined) return;
      fields.push({ key, label, type, value: params[key] });
    };

    pushIfPresent("sets", "Sets", "number");
    pushIfPresent("reps", "Reps", "number");
    pushIfPresent("distance_m", "Distance (m)", "number");
    pushIfPresent("duration_sec", "Duration (sec)", "number");
    pushIfPresent("rest_sec", "Rest (sec)", "number");
    pushIfPresent("pace", "Pace", "text");
    pushIfPresent("rpe", "RPE", "number");
    pushIfPresent("intensity", "Intensity", "text");
    pushIfPresent("notes", "Notes", "text");

    return { mode: "simple" as const, fields };
  }

  function coerceFieldValue(type: "number" | "text" | "toggle", raw: string) {
    if (type === "number") {
      const n = raw.trim() === "" ? null : Number(raw);
      return Number.isFinite(n as any) ? n : null;
    }
    if (type === "toggle") return raw === "true";
    return raw;
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

  function isProgramWorkout(w: WorkoutRow | null | undefined) {
    return Boolean(w && !w.is_system_template);
  }

  function isArchivedWorkout(w: WorkoutRow | null | undefined) {
    return Boolean(w && (w.archived_at ?? null));
  }

  async function archiveWorkout(workoutId: string, action: "archive" | "unarchive") {
    const res = await fetch(`/api/programs/${programId}/training/workouts/${workoutId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${text || ""}`.trim());
    }

    const json = (await res.json()) as any;
    return {
      archivedAt: json?.archivedAt ?? json?.data?.archivedAt ?? null,
      updatedAt: json?.updatedAt ?? json?.data?.updatedAt ?? null,
    };
  }

  async function loadExercises(nextQ?: string) {
    setExerciseError(null);
    setExerciseLoading(true);
    try {
      const sp = new URLSearchParams();
      const query = (typeof nextQ === "string" ? nextQ : exerciseQ).trim();
      if (query) sp.set("q", query);
      sp.set("limit", "200");

      const res = await fetch(`/api/programs/${programId}/training/exercises?${sp.toString()}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${text || ""}`.trim());
      }

      const json = (await res.json()) as any;
      const list = (json?.exercises ?? json?.data?.exercises ?? json?.data ?? json) as any[];

      setExercises(
        (Array.isArray(list) ? list : []).map((x) => ({
          id: x.id,
          label: x.label ?? "",
          description: x.description ?? null,
        }))
      );
    } catch (e: any) {
      setExercises([]);
      setExerciseError(e?.message ?? "Failed to load exercises");
    } finally {
      setExerciseLoading(false);
    }
  }

  async function loadDuplicates() {
    setDupesLoading(true);
    setDupesError(null);
    try {
      const sp = new URLSearchParams();
      sp.set("mode", "duplicates");
      sp.set("limit", "200");

      const query = q.trim();
      if (query) sp.set("q", query);

      const res = await fetch(`/api/programs/${programId}/training/workouts?${sp.toString()}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${text || ""}`.trim());
      }

      const json = (await res.json()) as any;
      const groups = (json?.groups ?? []) as DuplicateGroup[];
      setDupeGroups(groups);

      // Default: keep the most recently updated item per group
      const nextKeep: Record<string, string> = {};
      for (const g of groups) {
        const items = (g.items ?? []).slice();
        items.sort((a, b) => {
          const aT = a.updated_at ? Date.parse(a.updated_at) : 0;
          const bT = b.updated_at ? Date.parse(b.updated_at) : 0;
          return bT - aT;
        });
        if (items[0]?.id) nextKeep[g.signature] = items[0].id;
      }
      setKeepBySig(nextKeep);
    } catch (e: any) {
      setDupesError(e?.message ?? "Failed to load duplicates");
    } finally {
      setDupesLoading(false);
    }
  }

  async function archiveDuplicateGroup(signature: string) {
    const keepId = keepBySig[signature];
    const group = dupeGroups.find((g) => g.signature === signature);
    if (!group) return;

    const toArchive = (group.items ?? []).filter((i) => i.id !== keepId && !i.archived_at);
    if (toArchive.length === 0) return;

    setArchivingDupes(true);
    setDupesError(null);
    try {
      for (const item of toArchive) {
        await archiveWorkout(item.id, "archive");
      }
      await loadDuplicates();
      await load();
    } catch (e: any) {
      setDupesError(e?.message ?? "Failed to archive duplicates");
    } finally {
      setArchivingDupes(false);
    }
  }

  const [dupesHintDismissed, setDupesHintDismissed] = React.useState(false);
  const [dupesHintCount, setDupesHintCount] = React.useState<number>(0);
  const [dupesHintLoading, setDupesHintLoading] = React.useState(false);

  async function checkDuplicatesHint() {
    if (dupesHintDismissed) return;
    setDupesHintLoading(true);
    try {
      const sp = new URLSearchParams();
      sp.set("mode", "duplicates");
      sp.set("limit", "200");

      const res = await fetch(`/api/programs/${programId}/training/workouts?${sp.toString()}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        setDupesHintCount(0);
        return;
      }

      const json = (await res.json()) as any;
      const groups = (json?.groups ?? []) as any[];
      setDupesHintCount(groups.length);
    } catch {
      setDupesHintCount(0);
    } finally {
      setDupesHintLoading(false);
    }
  }

  function appendStep(partial: { label: string | null; params: any; exerciseLabel: string; exerciseId: string | null }) {
    const newId = `new_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    setEditSteps((prev) => {
      const next = prev.slice();
      next.push({
        id: newId,
        stepIndex: next.length + 1,
        ...partial,
      });
      return reindexSteps(next);
    });

    setTimeout(() => {
      const el = editStepsScrollRef.current;
      if (!el) return;
      el.scrollTop = el.scrollHeight;
    }, 0);
  }

  function addManualStep() {
    setStepEditError(null);
    appendStep({
      label: null,
      params: { intensity: "easy" },
      exerciseLabel: "",
      exerciseId: null,
    });
  }

  function addStepFromExercise(ex: { id: string; label: string }) {
    setStepEditError(null);
    appendStep({
      label: null,
      params: { intensity: "easy" },
      exerciseLabel: ex.label ?? "",
      exerciseId: ex.id,
    });
  }

  function reindexSteps(list: typeof editSteps) {
    const sorted = list.slice().sort((a, b) => (a.stepIndex ?? 0) - (b.stepIndex ?? 0));
    return sorted.map((s, i) => ({ ...s, stepIndex: i + 1 }));
  }

  function reindexStepsByArrayOrder(list: typeof editSteps) {
    return list.map((s, i) => ({ ...s, stepIndex: i + 1 }));
  }

  function addStepFromLast() {
    setStepEditError(null);
    setEditSteps((prev) => {
      const next = prev.slice();
      const ordered = next.slice().sort((a, b) => (a.stepIndex ?? 0) - (b.stepIndex ?? 0));
      const last = ordered[ordered.length - 1];

      const base = last
        ? {
            label: last.label,
            params: { ...(last.params ?? {}) },
            exerciseLabel: last.exerciseLabel,
            exerciseId: last.exerciseId ?? null,
          }
        : { label: null, params: {}, exerciseLabel: "", exerciseId: null };

      next.push({
        id: `new_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        stepIndex: next.length + 1,
        ...base,
      });

      return reindexSteps(next);
    });
  }

  function removeStep(stepId: string) {
    setStepEditError(null);
    setEditSteps((prev) => reindexSteps(prev.filter((s) => s.id !== stepId)));
  }

  function moveStep(stepId: string, direction: "up" | "down") {
    setStepEditError(null);
    setEditSteps((prev) => {
      const ordered = prev.slice().sort((a, b) => (a.stepIndex ?? 0) - (b.stepIndex ?? 0));
      const idx = ordered.findIndex((s) => s.id === stepId);
      if (idx === -1) return prev;
      const nextIdx = direction === "up" ? idx - 1 : idx + 1;
      if (nextIdx < 0 || nextIdx >= ordered.length) return prev;

      const next = ordered.slice();
      const [item] = next.splice(idx, 1);
      next.splice(nextIdx, 0, item);
      return reindexStepsByArrayOrder(next);
    });
  }

  function duplicateStep(stepId: string) {
    setStepEditError(null);
    setEditSteps((prev) => {
      const ordered = prev.slice().sort((a, b) => (a.stepIndex ?? 0) - (b.stepIndex ?? 0));
      const idx = ordered.findIndex((s) => s.id === stepId);
      if (idx === -1) return prev;

      const src = ordered[idx];
      const clone = {
        ...src,
        id: `new_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        // stepIndex is reindexed below
        stepIndex: src.stepIndex + 1,
        params: { ...(src.params ?? {}) },
      };

      const next = ordered.slice();
      next.splice(idx + 1, 0, clone);
      return reindexStepsByArrayOrder(next);
    });

    setTimeout(() => {
      const el = editStepsScrollRef.current;
      if (!el) return;
      el.scrollTop = el.scrollHeight;
    }, 0);
  }

  function reorderSteps(sourceId: string, targetId: string) {
    if (!sourceId || !targetId || sourceId === targetId) return;
    setEditSteps((prev) => {
      const ordered = prev.slice().sort((a, b) => (a.stepIndex ?? 0) - (b.stepIndex ?? 0));
      const from = ordered.findIndex((s) => s.id === sourceId);
      const to = ordered.findIndex((s) => s.id === targetId);
      if (from === -1 || to === -1) return prev;

      const next = ordered.slice();
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return reindexStepsByArrayOrder(next);
    });
  }

  function resetEditorTransientUI() {
    setAddStepChooserOpen(false);
    setExercisePanelOpen(false);
    setExerciseQ("");
    setExerciseError(null);
    setExercises([]);
    setExerciseLoading(false);
  }

  function seedEditorFromDetail() {
    if (!detail?.workout) return;

    // Always start from the saved/canonical detail state
    setEditLabel(detail.workout.label ?? "");
    setEditDesc(detail.workout.description ?? "");

    const steps = (detail.steps ?? [])
      .slice()
      .sort((a, b) => (a.stepIndex ?? 0) - (b.stepIndex ?? 0))
      .map((s: any) => ({
        id: s.id,
        stepIndex: s.stepIndex ?? 0,
        label: s.label ?? null,
        params: s.params ?? s.parameters_override ?? s.parametersOverride ?? {},
        exerciseId: s.exercise?.id ?? null,
        exerciseLabel: s.exercise?.label ?? "",
      }));

    setEditSteps(steps);
    setStepEditError(null);
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
          <button
            onClick={() => {
              setDupesOpen(true);
              void loadDuplicates();
            }}
            className="h-10 whitespace-nowrap rounded-md ring-1 ring-panel bg-panel-muted px-3 text-sm text-[var(--foreground)] hover:bg-panel"
            title="Find duplicate program workouts"
          >
            Find duplicates
          </button>
        </div>
      </div>

      {/* Body */}
      {dupesHintCount > 0 && !dupesHintDismissed ? (
        <div className="rounded-xl ring-1 ring-panel panel p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-[var(--foreground)]">
              <span className="font-medium">Duplicates found.</span>{" "}
              {dupesHintLoading
                ? "Checking…"
                : `${dupesHintCount} group${dupesHintCount === 1 ? "" : "s"} of duplicate program workouts detected.`}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setDupesOpen(true);
                  void loadDuplicates();
                }}
                className="h-9 rounded-md bg-[var(--brand-primary)] px-3 text-sm font-medium text-[var(--brand-contrast)] hover:opacity-90"
              >
                Review duplicates
              </button>
              <button
                type="button"
                onClick={() => setDupesHintDismissed(true)}
                className="h-9 rounded-md ring-1 ring-panel bg-panel-muted px-3 text-sm text-[var(--foreground)] hover:bg-panel"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      ) : null}
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
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        resetEditorTransientUI();
                        seedEditorFromDetail();
                        setEditOpen(true);
                      }}
                      className="h-10 rounded-md ring-1 ring-panel bg-panel-muted px-3 text-sm font-medium text-[var(--foreground)] hover:bg-panel"
                      title="Edit workout"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        if (!detail?.workout?.id) return;
                        setDetailError(null);
                        try {
                          const archived = isArchivedWorkout(detail.workout);
                          const nextAction = archived ? "unarchive" : "archive";
                          const result = await archiveWorkout(detail.workout.id, nextAction);

                          // Update local detail state
                          setDetail((prev) => {
                            if (!prev) return prev;
                            return {
                              ...prev,
                              workout: {
                                ...prev.workout,
                                archived_at: result.archivedAt,
                                updated_at: result.updatedAt ?? prev.workout.updated_at,
                              },
                            };
                          });

                          await load();
                        } catch (e: any) {
                          setDetailError(e?.message ?? "Failed to update archive state");
                        }
                      }}
                      className={
                        isArchivedWorkout(detail?.workout)
                          ? "h-10 rounded-md bg-[var(--brand-primary)] px-3 text-sm font-medium text-[var(--brand-contrast)] hover:opacity-90"
                          : "h-10 rounded-md ring-1 ring-[var(--danger)]/40 bg-[var(--danger)]/10 px-3 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--danger)]/15"
                      }
                      title={isArchivedWorkout(detail?.workout) ? "Unarchive workout" : "Archive workout"}
                    >
                      {isArchivedWorkout(detail?.workout) ? "Unarchive" : "Archive"}
                    </button>
                  </div>
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
                <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl ring-1 ring-panel panel shadow-xl">
                  <div className="flex items-start justify-between gap-3 p-4">
                    <div>
                      <div className="text-sm font-semibold text-[var(--foreground)]">Edit workout</div>
                      <div className="text-sm text-[var(--muted-foreground)]">Update label and description.</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        resetEditorTransientUI();
                        setEditOpen(false);
                      }}
                      className="rounded-md ring-1 ring-panel bg-panel-muted px-2 py-1 text-sm text-[var(--foreground)] hover:bg-panel"
                    >
                      Close
                    </button>
                  </div>

                  <div className="flex-1 overflow-auto p-4">
                    <div className="space-y-3">
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
                      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs font-medium text-[var(--muted-foreground)]">Steps</div>
                      </div>

                      <div className="flex gap-3">
                        {/* LEFT: steps */}
                        <div className="min-w-0 flex-1">
                          {stepEditError ? (
                            <div className="mb-2 rounded-lg ring-1 ring-[var(--danger)]/40 panel p-2 text-xs">
                              <div className="font-medium text-[var(--danger)]">Step edit error</div>
                              <div className="mt-0.5 text-[var(--muted-foreground)]">{stepEditError}</div>
                            </div>
                          ) : null}

                        <div ref={editStepsScrollRef} className="max-h-[45vh] overflow-auto px-3 pt-3 pb-2 space-y-3">
                        {editSteps
                          .slice()
                          .sort((a, b) => (a.stepIndex ?? 0) - (b.stepIndex ?? 0))
                          .map((s, idx) => (
                            <div
                              key={s.id}
                              onDragOver={(e) => {
                                const source = dragStepId || e.dataTransfer.getData("text/plain");
                                if (!source) return;
                                e.preventDefault();
                                e.dataTransfer.dropEffect = "move";
                                setDragOverStepId(s.id);
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                const source = dragStepId || e.dataTransfer.getData("text/plain");
                                const target = s.id;
                                if (source && target) reorderSteps(source, target);
                                setDragStepId(null);
                                setDragOverStepId(null);
                              }}
                              className={
                                dragOverStepId === s.id
                                  ? "rounded-xl ring-2 ring-[var(--focus-ring)] panel p-4"
                                  : "rounded-xl ring-1 ring-panel panel p-4"
                              }
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-xs text-[var(--muted-foreground)]">Step {s.stepIndex}</div>
                                  {s.exerciseLabel ? (
                                    <div className="mt-0.5 text-xs text-[var(--muted-foreground)]">Exercise: {s.exerciseLabel}</div>
                                  ) : null}
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    draggable
                                    onDragStart={(e) => {
                                      setDragStepId(s.id);
                                      e.dataTransfer.setData("text/plain", s.id);
                                      e.dataTransfer.effectAllowed = "move";
                                    }}
                                    onDragEnd={() => {
                                      setDragStepId(null);
                                      setDragOverStepId(null);
                                    }}
                                    className="h-8 w-8 cursor-move select-none rounded-md ring-1 ring-panel bg-panel-muted text-sm font-semibold text-[var(--foreground)] hover:bg-panel"
                                    title="Drag to reorder"
                                    aria-label="Drag to reorder"
                                  >
                                    ⋮⋮
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => moveStep(s.id, "up")}
                                    disabled={idx === 0}
                                    className="h-8 rounded-md ring-1 ring-panel bg-panel-muted px-2 text-xs font-medium text-[var(--foreground)] hover:bg-panel disabled:opacity-50"
                                    title="Move up"
                                  >
                                    ↑
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => moveStep(s.id, "down")}
                                    disabled={
                                      idx ===
                                      editSteps
                                        .slice()
                                        .sort((a, b) => (a.stepIndex ?? 0) - (b.stepIndex ?? 0)).length - 1
                                    }
                                    className="h-8 rounded-md ring-1 ring-panel bg-panel-muted px-2 text-xs font-medium text-[var(--foreground)] hover:bg-panel disabled:opacity-50"
                                    title="Move down"
                                  >
                                    ↓
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => duplicateStep(s.id)}
                                    className="h-8 rounded-md ring-1 ring-panel bg-panel-muted px-2 text-xs font-medium text-[var(--foreground)] hover:bg-panel"
                                    title="Duplicate step"
                                  >
                                    Duplicate
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => removeStep(s.id)}
                                    className="h-8 rounded-md ring-1 ring-[var(--danger)]/40 bg-[var(--danger)]/10 px-2 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--danger)]/20"
                                    title="Remove step"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>

                              <div className="mt-2 space-y-3">
                                <div>
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

                                <div>
                                  <div className="mb-1 flex items-center justify-between">
                                    <div className="text-xs font-medium text-[var(--muted-foreground)]">Parameters</div>
                                    <div className="text-[11px] text-[var(--muted-foreground)]">Coach-facing fields only.</div>
                                  </div>

                                  {(() => {
                                    const paramsObj = s.params ?? {};
                                    const spec = buildCoachFacingParamSpec(paramsObj);

                                    if (spec.mode !== "simple" || spec.fields.length === 0) {
                                      return (
                                        <div className="rounded-lg ring-1 ring-panel bg-panel-muted p-3 text-[12px] text-[var(--muted-foreground)]">
                                          No editable parameters for this step.
                                        </div>
                                      );
                                    }

                                    return (
                                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                        {spec.fields.map((f) => (
                                          <div key={f.key} className={spec.fields.length === 1 ? "md:col-span-2" : undefined}>
                                            <div className="mb-1 text-[11px] font-medium text-[var(--muted-foreground)]">{f.label}</div>
                                            <input
                                              value={f.value ?? ""}
                                              onChange={(e) => {
                                                const nextVal = coerceFieldValue(f.type, e.target.value);
                                                setStepEditError(null);
                                                setEditSteps((prev) =>
                                                  prev.map((p) => {
                                                    if (p.id !== s.id) return p;
                                                    const nextParams = { ...(p.params ?? {}) };
                                                    (nextParams as any)[f.key] = nextVal;
                                                    return { ...p, params: nextParams };
                                                  })
                                                );
                                              }}
                                              type={f.type === "number" ? "number" : "text"}
                                              className="h-9 w-full rounded-md ring-1 ring-panel bg-panel-muted px-3 text-sm text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                                            />
                                          </div>
                                        ))}
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                    {/* RIGHT: slide-out library */}
                    {exercisePanelOpen ? (
                      <div className="w-80 shrink-0 rounded-xl ring-1 ring-panel bg-panel-muted">
                        <div className="flex items-center justify-between gap-2 p-3">
                          <div className="text-sm font-semibold text-[var(--foreground)]">Exercise library</div>
                          <button
                            type="button"
                            onClick={() => setExercisePanelOpen(false)}
                            className="h-8 rounded-md ring-1 ring-panel bg-panel px-2 text-xs font-medium text-[var(--foreground)] hover:bg-panel-muted"
                          >
                            Close
                          </button>
                        </div>

                        <div className="px-3 pb-3">
                          <input
                            value={exerciseQ}
                            onChange={(e) => setExerciseQ(e.target.value)}
                            placeholder="Search exercises…"
                            className="h-10 w-full rounded-md ring-1 ring-panel bg-panel px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--text-subtle)] outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                          />
                        </div>

                        <div className="max-h-[38vh] overflow-auto px-3 pb-3">
                          {exerciseError ? (
                            <div className="mb-3 rounded-lg ring-1 ring-[var(--danger)]/40 panel p-2 text-xs">
                              <div className="font-medium text-[var(--danger)]">Exercise load error</div>
                              <div className="mt-0.5 text-[var(--muted-foreground)]">{exerciseError}</div>
                            </div>
                          ) : null}

                          {exerciseLoading ? (
                            <div className="rounded-lg ring-1 ring-panel panel p-3 text-xs text-[var(--muted-foreground)]">
                              Loading exercises…
                            </div>
                          ) : exercises.length === 0 ? (
                            <div className="rounded-lg ring-1 ring-panel panel p-3 text-xs text-[var(--muted-foreground)]">
                              No exercises found.
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {exercises.map((ex) => (
                                <button
                                  key={ex.id}
                                  type="button"
                                  onClick={() => addStepFromExercise(ex)}
                                  className="w-full rounded-lg ring-1 ring-panel bg-panel p-3 text-left hover:bg-panel-muted"
                                >
                                  <div className="text-sm font-semibold text-[var(--foreground)]">{ex.label}</div>
                                  {ex.description ? (
                                    <div className="mt-1 line-clamp-2 text-xs text-[var(--muted-foreground)]">
                                      {ex.description}
                                    </div>
                                  ) : null}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="border-t border-[var(--panel-border)] p-3">
                          <div className="text-xs text-[var(--muted-foreground)]">
                            Select an exercise to add a step. You can add multiple without reopening.
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                    </div>
                    {addStepChooserOpen ? (
                      <div className="px-4 pb-0">
                        <div className="mb-3 rounded-xl ring-1 ring-panel panel p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <div className="text-sm font-semibold text-[var(--foreground)]">Add a step</div>
                              <div className="text-xs text-[var(--muted-foreground)]">Choose how you want to add this step.</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setAddStepChooserOpen(false)}
                              className="h-8 rounded-md ring-1 ring-panel bg-panel-muted px-2 text-xs font-medium text-[var(--foreground)] hover:bg-panel"
                            >
                              Close
                            </button>
                          </div>

                          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <button
                              type="button"
                              onClick={() => {
                                setAddStepChooserOpen(false);
                                setExercisePanelOpen(true);
                                void loadExercises("");
                              }}
                              className="h-10 rounded-md bg-[var(--brand-primary)] px-3 text-sm font-medium text-[var(--brand-contrast)] hover:opacity-90"
                            >
                              Add from exercise library
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAddStepChooserOpen(false);
                                addManualStep();
                              }}
                              className="h-10 rounded-md ring-1 ring-panel bg-panel-muted px-3 text-sm font-medium text-[var(--foreground)] hover:bg-panel"
                            >
                              Create manual step
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                    <div className="flex items-center justify-between gap-2 border-t border-[var(--panel-border)] p-4">
                      <button
                        type="button"
                        onClick={() => setAddStepChooserOpen(true)}
                        className="h-10 rounded-md ring-1 ring-panel bg-panel-muted px-3 text-sm font-medium text-[var(--foreground)] hover:bg-panel"
                      >
                        + Add step
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            resetEditorTransientUI();
                            setEditOpen(false);
                          }}
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
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      {/* Duplicates modal */}
      {dupesOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
          <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl ring-1 ring-panel panel shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--panel-border)] p-4">
              <div>
                <div className="text-sm font-semibold text-[var(--foreground)]">Duplicate program workouts</div>
                <div className="text-sm text-[var(--muted-foreground)]">
                  Groups are matched by label + ordered step signature. Archive keeps the history safe.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDupesOpen(false)}
                className="shrink-0 rounded-md ring-1 ring-panel bg-panel-muted px-2 py-1 text-sm text-[var(--foreground)] hover:bg-panel"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              <div className="flex h-full">
                <div className="flex-1 overflow-auto p-4">
                  {/* existing content stays exactly as-is */}
              {dupesLoading ? (
                <div className="rounded-xl ring-1 ring-panel panel p-6 text-sm text-[var(--muted-foreground)]">
                  Scanning workouts…
                </div>
              ) : dupesError ? (
                <div className="rounded-xl ring-1 ring-[var(--danger)]/40 panel p-3 text-sm">
                  <div className="font-medium text-[var(--danger)]">Error</div>
                  <div className="mt-1 text-[var(--muted-foreground)]">{dupesError}</div>
                </div>
              ) : dupeGroups.length === 0 ? (
                <div className="rounded-xl ring-1 ring-panel panel p-6 text-sm text-[var(--muted-foreground)]">
                  No duplicate groups found.
                </div>
              ) : (
                <div className="space-y-3">
                  {dupeGroups.map((g) => {
                    const keepId = keepBySig[g.signature];
                    return (
                      <div key={g.signature} className="rounded-xl ring-1 ring-panel panel p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="text-sm font-semibold text-[var(--foreground)]">
                            {g.items.length} duplicates
                          </div>
                          <button
                            type="button"
                            disabled={archivingDupes}
                            onClick={() => void archiveDuplicateGroup(g.signature)}
                            className="h-9 rounded-md ring-1 ring-panel bg-panel-muted px-3 text-sm font-medium text-[var(--foreground)] hover:bg-panel disabled:opacity-60"
                            title="Archive all but the selected keep workout"
                          >
                            {archivingDupes ? "Archiving…" : "Archive duplicates"}
                          </button>
                        </div>

                        <div className="mt-3 space-y-2">
                          {g.items.map((i) => {
                            const isKeep = keepId === i.id;
                            const isArchived = Boolean(i.archived_at);
                            return (
                              <label
                                key={i.id}
                                className={
                                  isArchived
                                    ? "flex cursor-not-allowed items-start gap-3 rounded-lg ring-1 ring-panel bg-panel-muted/70 p-3 opacity-70"
                                    : "flex cursor-pointer items-start gap-3 rounded-lg ring-1 ring-panel bg-panel-muted p-3 hover:bg-panel"
                                }
                              >
                                <input
                                  type="radio"
                                  name={`keep-${g.signature}`}
                                  disabled={isArchived}
                                  checked={isKeep}
                                  onChange={() =>
                                    setKeepBySig((prev) => ({
                                      ...prev,
                                      [g.signature]: i.id,
                                    }))
                                  }
                                  className="mt-1"
                                />
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <div className="truncate text-sm font-semibold text-[var(--foreground)]">{i.label}</div>
                                    {isKeep ? (
                                      <span className="inline-flex items-center rounded-full ring-1 ring-panel bg-[var(--brand-primary)]/15 px-2 py-0.5 text-[11px] font-medium text-[var(--foreground)]">
                                        Keep
                                      </span>
                                    ) : null}
                                    {isArchived ? (
                                      <span className="inline-flex items-center rounded-full ring-1 ring-panel bg-[var(--danger)]/10 px-2 py-0.5 text-[11px] font-medium text-[var(--foreground)]">
                                        Archived
                                      </span>
                                    ) : null}
                                  </div>
                                  <div className="mt-1 line-clamp-2 text-sm text-[var(--muted-foreground)]">{i.description || "—"}</div>
                                  <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                                    {typeof i.step_count === "number" ? `${i.step_count} steps` : "—"}
                                    {i.updated_at ? ` • updated ${new Date(i.updated_at).toLocaleDateString()}` : ""}
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div> 
          </div>
        </div>

            <div className="flex items-center justify-end gap-2 border-t border-[var(--panel-border)] p-4">
              <button
                type="button"
                onClick={() => void loadDuplicates()}
                disabled={dupesLoading || archivingDupes}
                className="h-10 rounded-md ring-1 ring-panel bg-panel-muted px-3 text-sm text-[var(--foreground)] hover:bg-panel disabled:opacity-60"
              >
                Refresh
              </button>
              <button
                type="button"
                onClick={() => setDupesOpen(false)}
                className="h-10 rounded-md ring-1 ring-panel bg-panel-muted px-3 text-sm text-[var(--foreground)] hover:bg-panel"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}