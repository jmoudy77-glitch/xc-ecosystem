//app/programs/[programId]/teams/[teamId]/seasons/[seasonId]/practice/PracticeBuilderModal.tsx

"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { GlassModalShell } from "@/components/ui/GlassModalShell";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";

type PracticeGroupUI = {
  name: string;
  eventGroup?: string | null;
  athletes: { id: string; name: string }[];
};

type WorkoutUI = {
  id: string;
  label: string;
  description: string;
};

type ExerciseUI = {
  id: string;
  label: string;
  description?: string | null;
  workout_category?: string | null;
  measurement_unit?: string | null;
  tags?: string[] | null;
};

// Ensure group names are unique by suffixing duplicates with (2), (3), etc.
function ensureUniqueGroupNames(groups: PracticeGroupUI[]): PracticeGroupUI[] {
  const seen = new Map<string, number>();
  return (groups ?? []).map((g) => {
    const base = (g.name ?? "").trim() || "Group";
    const current = seen.get(base) ?? 0;
    const next = current + 1;
    seen.set(base, next);

    // Keep first occurrence as-is; suffix subsequent duplicates.
    const name = next === 1 ? base : `${base} (${next})`;
    return { ...g, name };
  });
}

// Merge duplicate groups by name (e.g., multiple "Distance" entries) so UI keys and DnD targets are stable.
function mergeGroupsByName(groups: PracticeGroupUI[]): PracticeGroupUI[] {
  const byName = new Map<string, PracticeGroupUI>();

  for (const g of groups ?? []) {
    const name = (g.name ?? "").trim() || "Group";
    const existing = byName.get(name);

    if (!existing) {
      // Normalize name and clone athletes
      byName.set(name, {
        ...g,
        name,
        athletes: Array.isArray(g.athletes) ? [...g.athletes] : [],
      });
      continue;
    }

    // Merge athletes, de-duping by id
    const mergedAthletes = [...(existing.athletes ?? [])];
    const seenIds = new Set(mergedAthletes.map((a) => a.id));
    for (const a of g.athletes ?? []) {
      if (!seenIds.has(a.id)) {
        mergedAthletes.push(a);
        seenIds.add(a.id);
      }
    }

    byName.set(name, {
      ...existing,
      // Keep the first non-null eventGroup
      eventGroup: existing.eventGroup ?? g.eventGroup ?? null,
      athletes: mergedAthletes,
    });
  }

  return Array.from(byName.values());
}

function exerciseToWorkout(ex: ExerciseUI): WorkoutUI {
  const metaBits = [ex.workout_category, ex.measurement_unit].filter(Boolean);
  const meta = metaBits.length ? ` • ${metaBits.join(" • ")}` : "";
  return {
    id: `exercise:${ex.id}`,
    label: ex.label,
    description: `${ex.description ?? ""}${meta}`.trim() || "Exercise",
  };
}

const WORKOUT_LIBRARY: WorkoutUI[] = [
  {
    id: "rest",
    label: "REST / Off Day",
    description: "Planned full recovery; no structured work.",
  },
  {
    id: "w1",
    label: "6x1k @ Threshold",
    description: "Classic tempo session.",
  },
  {
    id: "w2",
    label: "10x200m Speed Development",
    description: "Short, fast reps with full recovery.",
  },
  {
    id: "w3",
    label: "Easy Run 45′",
    description: "General aerobic maintenance.",
  },
];

function DraggableWorkoutCard({ workout }: { workout: WorkoutUI }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `workout-${workout.id}`,
    data: { type: "workout", workout },
  });

  const style: React.CSSProperties = {
    opacity: isDragging ? 0.9 : 1,
    cursor: isDragging ? "grabbing" : "grab",
    touchAction: "none",
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className={`rounded-md bg-panel-muted/35 p-2 ring-1 ring-white/10 shadow-[0_8px_22px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl transition-colors ${
        isDragging ? "ring-2 ring-[var(--brand)]/35 bg-panel-muted/45" : "hover:bg-panel-muted/45"
      }`}
    >
      <div className="text-xs font-semibold">{workout.label}</div>
      <div className="text-[10px] text-[var(--muted-foreground)]">{workout.description}</div>
    </div>
  );
}

function DraggableExerciseCard({ exercise }: { exercise: ExerciseUI }) {
  const workout = useMemo(() => exerciseToWorkout(exercise), [exercise]);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `exercise-${exercise.id}`,
    data: { type: "workout", workout },
  });

  const style: React.CSSProperties = {
    opacity: isDragging ? 0.9 : 1,
    cursor: isDragging ? "grabbing" : "grab",
    touchAction: "none",
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className={`rounded-md bg-panel-muted/35 p-2 ring-1 ring-white/10 shadow-[0_8px_22px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl transition-colors ${
        isDragging
          ? "ring-2 ring-[var(--brand)]/35 bg-panel-muted/45"
          : "hover:bg-panel-muted/45"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-xs font-semibold text-[var(--foreground)]">
            {exercise.label}
          </div>
          <div className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">
            {exercise.workout_category ? exercise.workout_category : "Exercise"}
            {exercise.measurement_unit ? ` • ${exercise.measurement_unit}` : ""}
          </div>
        </div>
      </div>
      {exercise.description ? (
        <div className="mt-1 line-clamp-2 text-[10px] text-[var(--muted-foreground)]">
          {exercise.description}
        </div>
      ) : null}
    </div>
  );
}

function AthleteChip({
  athlete,
  groupName,
  onSendToIndividual,
}: {
  athlete: { id: string; name: string };
  groupName: string;
  onSendToIndividual: (
    athleteId: string,
    athleteName: string,
    fromGroupName: string
  ) => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-panel-muted/35 px-2 py-0.5 text-[11px] text-[var(--foreground)] ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
      <span>{athlete.name}</span>
      <button
        type="button"
        onClick={() =>
          onSendToIndividual(athlete.id, athlete.name, groupName)
        }
        className="rounded-full bg-panel-muted/35 px-1 text-[9px] leading-none text-[var(--muted-foreground)] ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl hover:bg-panel-muted/50 hover:text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/35"
        aria-label="Create individual assignment lane"
      >
        →
      </button>
    </span>
  );
}

function GroupTile({
  group,
  assignedWorkouts,
  onRemoveWorkout,
  excludedAthleteIds = [],
  onSendToIndividual,
}: {
  group: PracticeGroupUI;
  assignedWorkouts: WorkoutUI[];
  onRemoveWorkout: (workoutId: string) => void;
  excludedAthleteIds?: string[];
  onSendToIndividual: (
    athleteId: string,
    athleteName: string,
    fromGroupName: string
  ) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `group-${group.name}`,
    data: { type: "group", groupName: group.name },
  });

  return (
    <div className="relative rounded-xl bg-panel-muted/30 p-4 ring-1 ring-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
      <div className="pointer-events-none absolute inset-0 rounded-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 rounded-t-xl bg-[radial-gradient(700px_90px_at_50%_0%,rgba(255,255,255,0.08),transparent_70%)]" />
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-semibold text-[var(--foreground)]">
          {group.name}
        </div>
        <span className="text-[11px] text-[var(--muted-foreground)]">
          {group.athletes.length} athletes • {assignedWorkouts.length} workouts
        </span>
      </div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {group.athletes
          .filter((ath) => !excludedAthleteIds.includes(ath.id))
          .map((ath) => (
            <AthleteChip
              key={ath.id}
              athlete={ath}
              groupName={group.name}
              onSendToIndividual={onSendToIndividual}
            />
          ))}
      </div>
      <div
        ref={setNodeRef}
        className={`relative rounded-md border border-dashed px-2 py-3 text-[11px] ring-1 ring-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl transition-colors ${
          isOver
            ? "border-[var(--brand)]/70 bg-[var(--brand)]/12 text-[var(--foreground)]"
            : "border-[var(--border)]/45 bg-panel-muted/25 text-[var(--muted-foreground)] hover:bg-panel-muted/35"
        }`}
      >
        {assignedWorkouts.length === 0 ? (
          <>Drop workouts or training events here to assign to this group.</>
        ) : (
          <div className="space-y-1">
            <div className="text-[10px] font-semibold uppercase tracking-wide">
              Assigned workouts
            </div>
            {assignedWorkouts.map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between gap-2 rounded-md bg-panel-muted/35 px-2 py-1 text-[11px] ring-1 ring-white/10 shadow-[0_6px_16px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl"
              >
                <span className="truncate">{w.label}</span>
                <button
                  type="button"
                  onClick={() => onRemoveWorkout(w.id)}
                  className="rounded-full px-1 text-[10px] leading-none text-[var(--muted-foreground)] bg-panel-muted/35 ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl hover:bg-rose-500/10 hover:text-rose-200 hover:ring-2 hover:ring-rose-500/30 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/25"
                  aria-label="Remove workout from group"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function IndividualLane({
  lane,
  assignedWorkouts,
  onRemoveWorkout,
}: {
  lane: { athleteId: string; name: string; fromGroupName: string };
  assignedWorkouts: WorkoutUI[];
  onRemoveWorkout: (workoutId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `individual-athlete-${lane.athleteId}`,
    data: { type: "individual-athlete", athleteId: lane.athleteId },
  });

  return (
    <div className="relative rounded-xl bg-panel-muted/30 p-3 text-[11px] ring-1 ring-white/10 shadow-[0_10px_28px_rgba(0,0,0,0.22)]">
      <div className="pointer-events-none absolute inset-0 rounded-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-14 rounded-t-xl bg-[radial-gradient(650px_85px_at_50%_0%,rgba(255,255,255,0.08),transparent_70%)]" />
      <div className="mb-1 flex items-center justify-between">
        <div className="font-semibold text-[var(--foreground)]">{lane.name}</div>
        <span className="text-[10px] text-[var(--muted-foreground)]">
          From group: {lane.fromGroupName}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`relative mt-1 rounded-md border border-dashed px-2 py-2 text-[11px] ring-1 ring-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl transition-colors ${
          isOver
            ? "border-[var(--brand)]/70 bg-[var(--brand)]/12 text-[var(--foreground)]"
            : "border-[var(--border)]/45 bg-panel-muted/25 text-[var(--muted-foreground)] hover:bg-panel-muted/35"
        }`}
      >
        {assignedWorkouts.length === 0 ? (
          <>Drop workouts or events here to override group plan.</>
        ) : (
          <div className="space-y-1">
            <div className="text-[10px] font-semibold uppercase tracking-wide">
              Individual workouts
            </div>
            {assignedWorkouts.map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between gap-2 rounded-md bg-panel-muted/35 px-2 py-1 text-[11px] ring-1 ring-white/10 shadow-[0_6px_16px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl"
              >
                <span className="truncate">{w.label}</span>
                <button
                  type="button"
                  onClick={() => onRemoveWorkout(w.id)}
                  className="rounded-full px-1 text-[10px] leading-none text-[var(--muted-foreground)] bg-panel-muted/35 ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl hover:bg-rose-500/10 hover:text-rose-200 hover:ring-2 hover:ring-rose-500/30 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/25"
                  aria-label="Remove workout from individual"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type PracticeBuilderModalProps = {
  open: boolean;
  onClose: () => void;
  programId: string;
  programName?: string;
  teamId: string;
  teamName?: string;
  seasonId: string;
  seasonName?: string;
  dateIso: string;
  displayDate: string;
  groups: PracticeGroupUI[];
  // When editing an existing practice, we can seed initial values
  initialPractice?: {
    id: string;
    program_id: string;
    team_season_id: string | null;
    practice_date: string;
    start_time: string | null;
    end_time: string | null;
    location: string | null;
    label: string;
    notes: string | null;
    status: string;
  };
  initialDetails?: {
    groups: {
      id: string;
      label: string;
      event_group: string | null;
      athletes: {
        id: string;
        name: string;
        event_group: string | null;
      }[];
    }[];
    individualSessions: {
      id: string;
      athleteName: string;
      event_group: string | null;
      title: string | null;
      workout_category: string | null;
    }[];
  };
};

export default function PracticeBuilderModal({
  open,
  onClose,
  programId,
  programName,
  teamId,
  teamName,
  seasonId,
  seasonName,
  dateIso,
  displayDate,
  groups,
  initialPractice,
  initialDetails,
}: PracticeBuilderModalProps) {
  // Helper to normalize DB timestamps or time strings into `HH:MM` for <input type="time">
  const extractTime = (value: string | null | undefined): string => {
    if (!value) return "";
    // If already looks like HH:MM, return as-is
    if (/^\d{2}:\d{2}$/.test(value)) return value;
    // If it's an ISO-like string, grab the time portion
    const tIndex = value.indexOf("T");
    if (tIndex !== -1 && value.length >= tIndex + 5) {
      return value.slice(tIndex + 1, tIndex + 6);
    }
    return "";
  };

  const [showIndividualPanel, setShowIndividualPanel] = useState(false);
  const safeGroups = groups ?? [];

  const baseGroupsRaw: PracticeGroupUI[] =
    initialDetails && initialDetails.groups && initialDetails.groups.length > 0
      ? initialDetails.groups.map((g) => ({
          name: g.label,
          eventGroup: g.event_group,
          athletes: g.athletes.map((a) => ({
            id: a.id,
            name: a.name,
          })),
        }))
      : safeGroups.length > 0
      ? safeGroups
      : [
          { name: "Distance", eventGroup: "distance", athletes: [] },
          { name: "Mid Distance", eventGroup: "mid_distance", athletes: [] },
          { name: "Sprints", eventGroup: "sprints", athletes: [] },
          { name: "Throws", eventGroup: "throws", athletes: [] },
        ];

  // Fix duplicate group labels coming from upstream data (e.g., multiple "Distance" groups)
  // by merging them into a single group before any UI keys / DnD ids are derived.
  const baseGroups: PracticeGroupUI[] = mergeGroupsByName(baseGroupsRaw);

  const initialGroups: PracticeGroupUI[] = ensureUniqueGroupNames(baseGroups);

  const [uiGroups, setUiGroups] = useState<PracticeGroupUI[]>(initialGroups);

  const [groupAssignments, setGroupAssignments] = useState<
    Record<string, WorkoutUI[]>
  >({});

  const [individualLanes, setIndividualLanes] = useState<
    { athleteId: string; name: string; fromGroupName: string }[]
  >([]);

  const [individualAssignments, setIndividualAssignments] = useState<
    Record<string, WorkoutUI[]>
  >({});

  const [activeLibraryTab, setActiveLibraryTab] = useState<
    "workouts" | "events"
  >("workouts");

  const [workoutQuery, setWorkoutQuery] = useState("");
  const [workouts, setWorkouts] = useState<WorkoutUI[]>([]);
  const [workoutsLoaded, setWorkoutsLoaded] = useState(false);
  const [workoutsLoading, setWorkoutsLoading] = useState(false);
  const [workoutsError, setWorkoutsError] = useState<string | null>(null);

    useEffect(() => {
    if (activeLibraryTab !== "workouts") return;
    if (workoutsLoaded) return;

    const controller = new AbortController();
    let mounted = true;

    (async () => {
      try {
        setWorkoutsLoading(true);
        setWorkoutsError(null);

        const url = `/api/programs/${programId}/training/workouts`;

        const res = await fetch(url, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          credentials: "include",
          signal: controller.signal,
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`Failed to load workouts (${res.status})${text ? `: ${text}` : ""}`);
        }

        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("text/html")) {
          const text = await res.text().catch(() => "");
          throw new Error(
            `Unexpected HTML response for workouts at ${url}${text ? `: ${text.slice(0, 80)}…` : ""}`
          );
        }

        const json = (await res.json().catch(() => null)) as any;
        const list = (json?.workouts ?? json ?? []) as any[];

    const mappedWorkouts: WorkoutUI[] = Array.isArray(list)
      ? list
          .map((w) => ({
            id: String(w.id ?? ""),
            label: String(w.label ?? w.name ?? "Workout"),
            description: String(w.description ?? ""),
          }))
          .filter((w) => w.id)
      : [];

    setWorkouts(mappedWorkouts);
        setWorkoutsLoaded(true);
      } catch (e: any) {
        if (controller.signal.aborted) return;
        if (mounted) {
          setWorkoutsError(e?.message ?? "Failed to load workouts");
          setWorkoutsLoaded(true);
        }
      } finally {
        if (mounted) setWorkoutsLoading(false);
      }
    })();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [activeLibraryTab, workoutsLoaded, programId]);

  const filteredWorkouts = useMemo(() => {
    const q = workoutQuery.trim().toLowerCase();
    const src = workoutsLoaded ? workouts : WORKOUT_LIBRARY; // keep your old constant as fallback
    if (!q) return src;
    return src.filter((w) => `${w.label} ${w.description ?? ""}`.toLowerCase().includes(q));
  }, [workoutQuery, workouts, workoutsLoaded]);

  const [exerciseQuery, setExerciseQuery] = useState("");
  const [exercises, setExercises] = useState<ExerciseUI[]>([]);
  const [exercisesLoaded, setExercisesLoaded] = useState(false);
  const [exercisesLoading, setExercisesLoading] = useState(false);
  const [exercisesError, setExercisesError] = useState<string | null>(null);

  useEffect(() => {
    // Lazy-load exercises only when the Training events tab is first opened.
    if (activeLibraryTab !== "events") return;
    if (exercisesLoaded) return;

    const controller = new AbortController();
    let mounted = true;

    (async () => {
      try {
        setExercisesLoading(true);
        setExercisesError(null);

        // Match the client-side behavior used elsewhere: no caching, allow auth cookies.
        const res = await fetch(`/api/programs/${programId}/training/exercises`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          credentials: "include",
          signal: controller.signal,
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(
            `Failed to load exercises (${res.status})${text ? `: ${text}` : ""}`
          );
        }

        const json = (await res.json().catch(() => null)) as any;
        const list = (json?.exercises ?? json ?? []) as ExerciseUI[];

        if (mounted) {
          setExercises(Array.isArray(list) ? list : []);
          setExercisesLoaded(true);
        }
      } catch (e: any) {
        // Ignore abort errors.
        if (controller.signal.aborted) return;
        if (mounted) {
          setExercisesError(e?.message ?? "Failed to load exercises");
          setExercisesLoaded(true);
        }
      } finally {
        if (mounted) setExercisesLoading(false);
      }
    })();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [activeLibraryTab, exercisesLoaded, programId]);

  const filteredExercises = useMemo(() => {
    const q = exerciseQuery.trim().toLowerCase();
    if (!q) return exercises;
    return exercises.filter((ex) => {
      const hay = `${ex.label} ${(ex.description ?? "")} ${(ex.workout_category ?? "")} ${(ex.measurement_unit ?? "")} ${(ex.tags ?? []).join(" ")}`
        .toLowerCase();
      return hay.includes(q);
    });
  }, [exerciseQuery, exercises]);

  const [activeWorkout, setActiveWorkout] = useState<WorkoutUI | null>(null);
  const [isDropping, setIsDropping] = useState(false);

  const [pendingIndividual, setPendingIndividual] = useState<
    | {
        athleteId: string;
        athleteName: string;
        fromGroupName: string;
      }
    | null
  >(null);

  const [pendingMoveChoice, setPendingMoveChoice] = useState<
    | {
        athleteId: string;
        athleteName: string;
        fromGroupName: string;
      }
    | null
  >(null);
  function moveAthleteToGroup(
    athleteId: string,
    athleteName: string,
    fromGroupName: string,
    targetGroupName: string
  ) {
    setUiGroups((prev) => {
      let movedAthlete: { id: string; name: string } | null = null;

      const afterRemoval = prev.map((group) => {
        if (group.name !== fromGroupName) return group;
        const remainingAthletes = group.athletes.filter((ath) => {
          if (ath.id === athleteId) {
            movedAthlete = ath;
            return false;
          }
          return true;
        });
        return { ...group, athletes: remainingAthletes };
      });

      if (!movedAthlete) {
        movedAthlete = { id: athleteId, name: athleteName };
      }

      const afterAdd = afterRemoval.map((group) => {
        if (group.name !== targetGroupName) return group;
        if (group.athletes.some((ath) => ath.id === athleteId)) {
          return group;
        }
        return { ...group, athletes: [...group.athletes, movedAthlete as { id: string; name: string }] };
      });

      return afterAdd;
    });

    // Clear any exclusions for this athlete on either group so they receive the new group's workouts.
    setExcludedFromGroupWorkouts((prev) => {
      const updated = { ...prev };
      const fromList = updated[fromGroupName]?.filter((id) => id !== athleteId);
      if (fromList && fromList.length > 0) {
        updated[fromGroupName] = fromList;
      } else {
        delete updated[fromGroupName];
      }
      const targetList = updated[targetGroupName]?.filter((id) => id !== athleteId);
      if (targetList && targetList.length > 0) {
        updated[targetGroupName] = targetList;
      } else {
        delete updated[targetGroupName];
      }
      return updated;
    });
  }

  function handleAthleteChipClick(
    athleteId: string,
    athleteName: string,
    fromGroupName: string
  ) {
    setPendingMoveChoice({
      athleteId,
      athleteName,
      fromGroupName,
    });
  }

  const [excludedFromGroupWorkouts, setExcludedFromGroupWorkouts] = useState<
    Record<string, string[]>
  >({});

  const [practiceLabel, setPracticeLabel] = useState(
    initialPractice?.label ?? ""
  );
  const [practiceDate, setPracticeDate] = useState(
    initialPractice?.practice_date ?? dateIso
  );
  // Keep modal state in sync with the selected calendar date when opening/ switching dates.
  // Without this, the modal can retain a previous date in state, causing the header/date input to drift.
  useEffect(() => {
    if (!open) return;

    // Editing: always prefer the practice's stored date.
    if (initialPractice?.practice_date) {
      setPracticeDate(initialPractice.practice_date);
      return;
    }

    // Creating: use the selected day coming from the calendar.
    if (dateIso) {
      setPracticeDate(dateIso);
    }
  }, [open, dateIso, initialPractice?.practice_date]);
  const headerDisplayDate = useMemo(() => {
  const iso = (practiceDate || dateIso || "").trim();
  if (!iso) return displayDate;

  // Parse as local midnight to avoid timezone shifting.
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return displayDate;

  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(d);
}, [practiceDate, dateIso, displayDate]);
  const [startTime, setStartTime] = useState(
    extractTime(initialPractice?.start_time ?? "")
  );
  const [endTime, setEndTime] = useState(
    extractTime(initialPractice?.end_time ?? "")
  );
  const [location, setLocation] = useState(initialPractice?.location ?? "");
  const [notes, setNotes] = useState(initialPractice?.notes ?? "");
  const [isSaving, setIsSaving] = useState(false);

  function sendAthleteToIndividual(
    athleteId: string,
    athleteName: string,
    fromGroupName: string
  ) {
    setIndividualLanes((prev) => {
      if (prev.some((lane) => lane.athleteId === athleteId)) {
        return prev;
      }
      return [...prev, { athleteId, name: athleteName, fromGroupName }];
    });

    setPendingIndividual({
      athleteId,
      athleteName,
      fromGroupName,
    });

    if (!showIndividualPanel) {
      setShowIndividualPanel(true);
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const activeData = event.active.data.current as any;
    if (activeData?.type === "workout") {
      setIsDropping(false);
      setActiveWorkout(activeData.workout as WorkoutUI);
    }
  }

  function handleDragCancel() {
    setActiveWorkout(null);
    setIsDropping(false);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const activeData = active.data.current as any;
    const overData = over?.data.current as any;

    // If nothing is under the cursor, clear state and exit.
    if (!over) {
      setActiveWorkout(null);
      setIsDropping(false);
      return;
    }

    // Workout dropped on a group
    if (activeData?.type === "workout" && overData?.type === "group") {
      const workout = activeData.workout as WorkoutUI;
      const groupName = overData.groupName as string;

      setGroupAssignments((prev) => {
        const existing = prev[groupName] ?? [];
        if (existing.some((w) => w.id === workout.id)) {
          return prev;
        }
        return {
          ...prev,
          [groupName]: [...existing, workout],
        };
      });

      setIsDropping(true);
      setTimeout(() => {
        setActiveWorkout(null);
        setIsDropping(false);
      }, 150);
      return;
    }

    // Workout dropped on an individual athlete lane
    if (activeData?.type === "workout" && overData?.type === "individual-athlete") {
      const workout = activeData.workout as WorkoutUI;
      const athleteId = overData.athleteId as string;

      setIndividualAssignments((prev) => {
        const existing = prev[athleteId] ?? [];
        if (existing.some((w) => w.id === workout.id)) {
          return prev;
        }
        return {
          ...prev,
          [athleteId]: [...existing, workout],
        };
      });

      setIsDropping(true);
      setTimeout(() => {
        setActiveWorkout(null);
        setIsDropping(false);
      }, 150);
      return;
    }

    // Fallback: clear any remaining drag state
    setActiveWorkout(null);
    setIsDropping(false);
  }

  async function handleSave() {
    if (isSaving) return;

    const hasGroupWorkout = uiGroups.some(
      (g) => groupAssignments[g.name] && groupAssignments[g.name].length > 0
    );
    const hasIndividualWorkout = Object.values(individualAssignments).some(
      (workouts) => workouts && workouts.length > 0
    );

    if (!hasGroupWorkout && !hasIndividualWorkout) {
      window.alert("Assign at least one group workout or one individual workout before saving.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        // ✅ send both camel + snake so the route can read either
        programId,
        program_id: programId,

        teamId,
        team_id: teamId,

        seasonId,
        season_id: seasonId,

        practiceLabel,
        practiceDate,
        startTime,
        endTime,
        location,
        notes,
        groups: uiGroups,
        groupAssignments,
        individualLanes,
        individualAssignments,
      };

      // ✅ sanity check in dev
      console.log("[PracticeBuilderModal] saving payload ids", {
        programId: payload.programId,
        program_id: payload.program_id,
        teamId: payload.teamId,
        seasonId: payload.seasonId,
      });

      const res = await fetch("/api/practice/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("[PracticeBuilderModal] Failed to save practice", res.status, text);
        window.alert("Failed to save practice. Please try again.");
        return;
      }

      const data = await res.json().catch(() => null);
      console.log("[PracticeBuilderModal] saved practice", data);
      onClose();
    } catch (err) {
      console.error("[PracticeBuilderModal] Error saving practice", err);
      window.alert("Something went wrong while saving. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  // Footer summary calculations
  const totalGroupsWithAssignments = Object.entries(groupAssignments).filter(
    ([, workouts]) => workouts.length > 0
  ).length;

  const totalAssignedWorkouts = Object.values(groupAssignments).reduce(
    (sum, workouts) => sum + workouts.length,
    0
  );

  const totalAthletes = uiGroups.reduce(
    (sum, group) => sum + group.athletes.length,
    0
  );

  const totalIndividualLanes = individualLanes.length;

  // IMPORTANT: Do not return early before hooks above; gate rendering here instead.
  if (!open) return null;
    return (
    <>
      <GlassModalShell
        open={open}
        onClose={onClose}
        header={
          <div className="flex items-center justify-between border-b border-[var(--border)]/50 px-5 py-3">
            <div className="space-y-1">
              <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                Practice builder
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--foreground)]">
                <span className="font-semibold">
                  {initialPractice ? "Edit practice" : "New practice"} –{" "}
                  {headerDisplayDate}
                </span>
                {/*
                <span className="rounded-full bg-panel-muted/35 px-2 py-0.5 text-[11px] text-[var(--muted-foreground)] ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl opacity-90">
                  Program: {programName ?? programId}
                </span>
                */}
                <span className="rounded-full bg-panel-muted/35 px-2 py-0.5 text-[11px] text-[var(--muted-foreground)] ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl opacity-90">
                  Team: {teamName ?? teamId}
                </span>
                <span className="rounded-full bg-panel-muted/35 px-2 py-0.5 text-[11px] text-[var(--muted-foreground)] ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl opacity-90">
                  Season: {seasonName ?? seasonId}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-xs text-[var(--foreground)] bg-panel-muted/35 ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl hover:bg-panel-muted/50 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/35"
            >
              Close
            </button>
          </div>
        }
        footer={
          <div className="flex items-center justify-between border-t border-[var(--border)]/50 bg-panel-muted/35 px-5 py-3 text-xs">
            <div className="text-[var(--muted-foreground)]">
              {totalGroupsWithAssignments === 0 && totalAssignedWorkouts === 0 ? (
                <>No workouts assigned yet. Drag workouts onto groups to begin.</>
              ) : (
                <>
                  {totalGroupsWithAssignments} group
                  {totalGroupsWithAssignments === 1 ? "" : "s"} with assignments •{" "}
                  {totalAssignedWorkouts} workout
                  {totalAssignedWorkouts === 1 ? "" : "s"} assigned across{" "}
                  {totalAthletes} athlete
                  {totalAthletes === 1 ? "" : "s"}
                  {totalIndividualLanes > 0 && (
                    <>
                      {" "}
                      • {totalIndividualLanes} individual lane
                      {totalIndividualLanes === 1 ? "" : "s"}
                    </>
                  )}
                  .
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-md px-3 py-1.5 text-xs text-[var(--foreground)] bg-panel-muted/35 ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl hover:bg-panel-muted/50 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/35"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="rounded-md px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] bg-[var(--brand)]/22 ring-1 ring-[var(--brand)]/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] hover:bg-[var(--brand)]/28 hover:ring-[var(--brand)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/35 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving..." : "Save practice"}
              </button>
            </div>
          </div>
        }
      >
        <div className="flex h-full min-h-0 flex-col">
        {/* Practice info row */}
        <div className="border-b border-[var(--border)]/50 px-5 py-3 text-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-[var(--muted-foreground)]">
                Practice label
              </label>
              <input
                type="text"
                className="w-full rounded-md bg-panel-muted/35 px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl hover:bg-panel-muted/45 focus:ring-2 focus:ring-[var(--brand)]/35 focus:outline-none"
                placeholder="e.g. Tempo Tuesday – 6x1k"
                value={practiceLabel}
                onChange={(e) => setPracticeLabel(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--muted-foreground)]">
                Date
              </label>
              <input
                type="date"
                value={practiceDate}
                onChange={(e) => setPracticeDate(e.target.value)}
                className="w-full rounded-md bg-panel-muted/35 px-3 py-2 text-sm text-[var(--foreground)] ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl hover:bg-panel-muted/45 focus:ring-2 focus:ring-[var(--brand)]/35 focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-[var(--muted-foreground)]">
                  Start time
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-md bg-panel-muted/35 px-3 py-2 text-sm text-[var(--foreground)] ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl hover:bg-panel-muted/45 focus:ring-2 focus:ring-[var(--brand)]/35 focus:outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-[var(--muted-foreground)]">
                  End time
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full rounded-md bg-panel-muted/35 px-3 py-2 text-sm text-[var(--foreground)] ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl hover:bg-panel-muted/45 focus:ring-2 focus:ring-[var(--brand)]/35 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--muted-foreground)]">
                Location
              </label>
              <input
                type="text"
                className="w-full rounded-md bg-panel-muted/35 px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl hover:bg-panel-muted/45 focus:ring-2 focus:ring-[var(--brand)]/35 focus:outline-none"
                placeholder="Track, trails, weight room..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-[var(--muted-foreground)]">
                Notes
              </label>
              <textarea
                className="h-9 w-full resize-none rounded-md bg-panel-muted/35 px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl hover:bg-panel-muted/45 focus:ring-2 focus:ring-[var(--brand)]/35 focus:outline-none"
                placeholder="Key focus, cues, adjustments..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Main body: group canvas + individual panel + libraries */}
        <DndContext
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Group assignment section */}
            <div className="flex min-w-[40%] flex-[2] flex-col min-h-0 border-r border-[var(--border)]/50">
              <div className="flex items-center justify-between border-b border-[var(--border)]/50 px-4 py-2.5">
                <div className="flex flex-col gap-0.5">
                  <div className="text-sm font-semibold text-[var(--foreground)]">
                    Group assignments
                  </div>
                  <div className="text-[11px] text-[var(--muted-foreground)]">
                    {uiGroups.length} group{uiGroups.length === 1 ? "" : "s"} •{" "}
                    {totalAthletes} athlete{totalAthletes === 1 ? "" : "s"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIndividualPanel((v) => !v)}
                  className="rounded-md px-2 py-1 text-[11px] text-[var(--foreground)] bg-panel-muted/35 ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl hover:bg-panel-muted/50 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/35"
                >
                  {showIndividualPanel
                    ? "Hide individual assignments"
                    : "Individual assignments ▸"}
                </button>
              </div>

              <div className="glass-scrollbar flex-1 overflow-auto px-4 py-3 text-sm">
                <div className="space-y-3">
                  {uiGroups.map((group, idx) => (
                    <GroupTile
                      key={`${group.name}-${group.eventGroup ?? ""}-${idx}`}
                      group={group}
                      assignedWorkouts={groupAssignments[group.name] ?? []}
                      excludedAthleteIds={excludedFromGroupWorkouts[group.name] ?? []}
                      onRemoveWorkout={(workoutId) => {
                        setGroupAssignments((prev) => {
                          const existing = prev[group.name] ?? [];
                          return {
                            ...prev,
                            [group.name]: existing.filter((w) => w.id !== workoutId),
                          };
                        });
                      }}
                      onSendToIndividual={handleAthleteChipClick}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Individual assignments panel */}
            {showIndividualPanel && (
              <div className="flex w-72 flex-col min-h-0 border-r border-[var(--border)]/50 bg-panel-muted/35">
                <div className="border-b border-[var(--border)]/50 px-3 py-2.5">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-[var(--foreground)]">
                      Individual assignments
                    </div>
                    {individualLanes.length > 0 && (
                      <div className="text-[10px] text-[var(--muted-foreground)]">
                        {individualLanes.length} lane
                        {individualLanes.length === 1 ? "" : "s"}
                      </div>
                    )}
                  </div>
                  <div className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                    Use the <span className="font-semibold">→</span> button on a group
                    athlete to create an individual lane, then drop workouts here to
                    override the group plan.
                  </div>
                </div>
                <div className="glass-scrollbar flex-1 overflow-auto px-3 py-2 text-sm">
                  {individualLanes.length === 0 ? (
                    <div className="rounded-md border border-dashed border-[var(--border)]/45 bg-panel-muted/25 p-2 text-[11px] text-[var(--muted-foreground)] ring-1 ring-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl">
                      No individual lanes yet. Use the{" "}
                      <span className="font-semibold">→</span> button on a group athlete
                      to create one.
                    </div>
                  ) : (
                    <div className="space-y-2 text-[11px] text-[var(--muted-foreground)]">
                      {individualLanes.map(
                        (lane: { athleteId: string; name: string; fromGroupName: string }) => (
                          <IndividualLane
                            key={lane.athleteId}
                            lane={lane}
                            assignedWorkouts={individualAssignments[lane.athleteId] ?? []}
                            onRemoveWorkout={(workoutId) => {
                              setIndividualAssignments((prev) => {
                                const existing = prev[lane.athleteId] ?? [];
                                return {
                                  ...prev,
                                  [lane.athleteId]: existing.filter((w) => w.id !== workoutId),
                                };
                              });
                            }}
                          />
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Libraries: workouts + training events */}
            <div className="flex min-w-[28%] flex-1 flex-col min-h-0 bg-panel-muted/35">
              <div className="border-b border-[var(--border)]/50 px-3 py-2">
                <div className="flex items-center gap-1 rounded-lg bg-panel-muted/25 p-1 ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
                  <button
                    type="button"
                    onClick={() => setActiveLibraryTab("workouts")}
                    className={`flex-1 rounded-md px-3 py-2 text-left text-xs transition-colors ${
                      activeLibraryTab === "workouts"
                        ? "bg-panel/60 font-semibold text-[var(--foreground)] ring-1 ring-white/10 shadow-[0_6px_18px_rgba(0,0,0,0.20),inset_0_1px_0_rgba(255,255,255,0.06)]"
                        : "text-[var(--muted-foreground)] hover:bg-panel-muted/35 hover:text-[var(--foreground)]"
                    }`}
                  >
                    Workouts
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveLibraryTab("events")}
                    className={`flex-1 rounded-md px-3 py-2 text-left text-xs transition-colors ${
                      activeLibraryTab === "events"
                        ? "bg-panel/60 font-semibold text-[var(--foreground)] ring-1 ring-white/10 shadow-[0_6px_18px_rgba(0,0,0,0.20),inset_0_1px_0_rgba(255,255,255,0.06)]"
                        : "text-[var(--muted-foreground)] hover:bg-panel-muted/35 hover:text-[var(--foreground)]"
                    }`}
                  >
                    Training events
                  </button>
                </div>
              </div>
              <div className="glass-scrollbar flex-1 overflow-auto px-3 py-2 text-sm">
                {activeLibraryTab === "workouts" ? (
                  <div className="space-y-2 text-[11px] text-[var(--muted-foreground)]">
                    <input
                      type="text"
                      value={workoutQuery}
                      onChange={(e) => setWorkoutQuery(e.target.value)}
                      placeholder="Search workouts…"
                      className="w-full rounded-md bg-panel-muted/35 px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl hover:bg-panel-muted/45 focus:ring-2 focus:ring-[var(--brand)]/35 focus:outline-none"
                    />
                    {workoutsLoading ? (
                      <div className="rounded-md bg-panel-muted/25 p-3 ring-1 ring-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                        Loading workouts…
                      </div>
                    ) : workoutsError ? (
                      <div className="rounded-md border border-dashed border-rose-500/30 bg-rose-500/10 p-3 text-[11px] text-rose-200 ring-1 ring-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                        {workoutsError}
                      </div>
                    ) : filteredWorkouts.length === 0 ? (
                      <div className="rounded-md border border-dashed border-[var(--border)]/45 bg-panel-muted/25 p-3 text-[11px] text-[var(--muted-foreground)] ring-1 ring-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl">
                        No workouts found.
                      </div>
                    ) : null}
                    {filteredWorkouts.map((workout) => (
                      <DraggableWorkoutCard key={workout.id} workout={workout} />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2 text-[11px] text-[var(--muted-foreground)]">
                    <div className="rounded-md bg-panel-muted/30 p-3 ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                      <div className="text-xs font-semibold text-[var(--foreground)]">
                        Exercises library
                      </div>
                      <div className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                        Drag an exercise onto a group or individual lane to assign it to this
                        practice.
                      </div>
                      <div className="mt-2">
                        <input
                          type="text"
                          value={exerciseQuery}
                          onChange={(e) => setExerciseQuery(e.target.value)}
                          placeholder="Search exercises…"
                          className="w-full rounded-md bg-panel-muted/35 px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl hover:bg-panel-muted/45 focus:ring-2 focus:ring-[var(--brand)]/35 focus:outline-none"
                        />
                      </div>
                    </div>

                    {exercisesLoading ? (
                      <div className="rounded-md bg-panel-muted/25 p-3 ring-1 ring-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                        Loading exercises…
                      </div>
                    ) : exercisesError ? (
                      <div className="rounded-md border border-dashed border-rose-500/30 bg-rose-500/10 p-3 text-[11px] text-rose-200 ring-1 ring-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                        {exercisesError}
                        <div className="mt-1 text-[10px] text-[var(--muted-foreground)]">
                          Expected endpoint:{" "}
                          <span className="font-mono">
                            /api/programs/{"${programId}"}/training/exercises
                          </span>
                        </div>
                      </div>
                    ) : filteredExercises.length === 0 ? (
                      <div className="rounded-md border border-dashed border-[var(--border)]/45 bg-panel-muted/25 p-3 text-[11px] text-[var(--muted-foreground)] ring-1 ring-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl">
                        No exercises found.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filteredExercises.map((ex) => (
                          <DraggableExerciseCard key={ex.id} exercise={ex} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {typeof document !== "undefined"
            ? createPortal(
                <DragOverlay dropAnimation={null}>
                  {activeWorkout ? (
                    <div
                      className={`rounded-md bg-panel/70 p-2 shadow-[0_18px_60px_rgba(0,0,0,0.45)] ring-1 ring-[var(--brand)]/45 backdrop-blur-2xl border border-white/10 transition-transform transition-opacity duration-150 ${
                        isDropping ? "scale-75 opacity-0" : "scale-100 opacity-100"
                      }`}
                      style={{ zIndex: 9999 }}
                    >
                      <div className="text-xs font-semibold">{activeWorkout.label}</div>
                      <div className="text-[10px] text-[var(--muted-foreground)]/90">
                        {activeWorkout.description}
                      </div>
                    </div>
                  ) : null}
                </DragOverlay>,
                document.body
              )
            : (
              <DragOverlay dropAnimation={null}>
                {activeWorkout ? (
                  <div
                    className={`rounded-md bg-panel/70 p-2 shadow-[0_18px_60px_rgba(0,0,0,0.45)] ring-1 ring-[var(--brand)]/45 backdrop-blur-2xl border border-white/10 transition-transform transition-opacity duration-150 ${
                      isDropping ? "scale-75 opacity-0" : "scale-100 opacity-100"
                    }`}
                  >
                    <div className="text-xs font-semibold">{activeWorkout.label}</div>
                    <div className="text-[10px] text-[var(--muted-foreground)]/90">
                      {activeWorkout.description}
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            )}
        </DndContext>
        </div>
      </GlassModalShell>

      {pendingMoveChoice && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/70 backdrop-blur-sm px-3">
          <div className="relative w-full max-w-sm rounded-xl panel bg-panel-muted p-4 text-xs shadow-xl ring-1 ring-panel">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />
            <div className="mb-2 text-sm font-semibold text-[var(--foreground)]">
              Adjust athlete assignment
            </div>
            <div className="mb-3 text-[var(--muted-foreground)]">
              What would you like to do with{" "}
              <span className="font-semibold">{pendingMoveChoice.athleteName}</span>?
            </div>
            <div className="space-y-2 mb-4">
              <button
                type="button"
                onClick={() => {
                  sendAthleteToIndividual(
                    pendingMoveChoice.athleteId,
                    pendingMoveChoice.athleteName,
                    pendingMoveChoice.fromGroupName
                  );
                  setPendingMoveChoice(null);
                }}
                className="w-full rounded-md px-3 py-1.5 text-[11px] font-semibold text-[var(--foreground)] bg-[var(--brand)]/22 ring-1 ring-[var(--brand)]/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] hover:bg-[var(--brand)]/28 hover:ring-[var(--brand)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/35"
              >
                Move to individual assignments
              </button>
              <div className="text-[11px] text-[var(--muted-foreground)]">
                Or move them into a different event group:
              </div>
              <div className="space-y-1">
                {uiGroups
                  .filter((g) => g.name !== pendingMoveChoice.fromGroupName)
                  .map((g, idx) => (
                    <button
                      key={`${g.name}-${idx}`}
                      type="button"
                      onClick={() => {
                        moveAthleteToGroup(
                          pendingMoveChoice.athleteId,
                          pendingMoveChoice.athleteName,
                          pendingMoveChoice.fromGroupName,
                          g.name
                        );
                        setPendingMoveChoice(null);
                      }}
                      className="w-full rounded-md px-3 py-1.5 text-[11px] text-[var(--foreground)] bg-panel-muted/35 ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl hover:bg-panel-muted/50 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/35"
                    >
                      Move to {g.name}
                    </button>
                  ))}
                {uiGroups.filter((g) => g.name !== pendingMoveChoice.fromGroupName).length ===
                  0 && (
                  <div className="text-[11px] text-[var(--muted-foreground)]">
                    No other groups available to move into.
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPendingMoveChoice(null)}
                className="rounded-md px-3 py-1.5 text-[11px] text-[var(--foreground)] bg-panel-muted/35 ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl hover:bg-panel-muted/50 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/35"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingIndividual && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm px-3">
          <div className="relative w-full max-w-sm rounded-xl panel bg-panel-muted p-4 text-xs shadow-xl ring-1 ring-panel">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />
            <div className="mb-2 text-sm font-semibold text-[var(--foreground)]">
              Remove from group workout?
            </div>
            <div className="mb-3 text-[var(--muted-foreground)]">
              {pendingIndividual.athleteName} has been moved into individual assignments. Do
              you want to remove them from their group workouts for this practice?
            </div>
            <div className="mb-3 text-[11px] text-[var(--muted-foreground)]">
              You can still assign custom work to this athlete in their individual lane
              regardless of this choice.
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingIndividual(null)}
                className="rounded-md px-3 py-1.5 text-[11px] text-[var(--foreground)] bg-panel-muted/35 ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl hover:bg-panel-muted/50 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/35"
              >
                Keep in group
              </button>
              <button
                type="button"
                onClick={() => {
                  setExcludedFromGroupWorkouts((prev) => {
                    const groupKey = pendingIndividual.fromGroupName;
                    const existing = prev[groupKey] ?? [];
                    if (existing.includes(pendingIndividual.athleteId)) return prev;
                    return {
                      ...prev,
                      [groupKey]: [...existing, pendingIndividual.athleteId],
                    };
                  });
                  setPendingIndividual(null);
                }}
                className="rounded-md px-3 py-1.5 text-[11px] font-semibold text-[var(--foreground)] bg-[var(--brand)]/22 ring-1 ring-[var(--brand)]/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] hover:bg-[var(--brand)]/28 hover:ring-[var(--brand)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/35"
              >
                Remove from group
              </button>
            </div>
          </div>
        </div>
      )}
    </>
);

}