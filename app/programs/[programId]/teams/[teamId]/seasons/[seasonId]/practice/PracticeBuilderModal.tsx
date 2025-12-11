//app/programs/[programId]/teams/[teamId]/seasons/[seasonId]/practice/PracticeBuilderModal.tsx

"use client";

import React, { useState } from "react";
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
      className={`rounded-md border bg-slate-900/70 p-2 ${
        isDragging
          ? "border-emerald-400 ring-1 ring-emerald-500/60"
          : "border-slate-800"
      }`}
    >
      <div className="text-xs font-semibold">{workout.label}</div>
      <div className="text-[10px] text-slate-400">{workout.description}</div>
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
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[11px] text-slate-200">
      <span>{athlete.name}</span>
      <button
        type="button"
        onClick={() =>
          onSendToIndividual(athlete.id, athlete.name, groupName)
        }
        className="rounded-full border border-slate-600 px-1 text-[9px] leading-none text-slate-300 hover:border-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-200"
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
    <div className="rounded-md border border-slate-800 bg-slate-950/80 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-semibold text-slate-100">
          {group.name}
        </div>
        <span className="text-[11px] text-slate-400">
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
        className={`rounded-md border border-dashed px-2 py-3 text-[11px] ${
          isOver
            ? "border-emerald-500 bg-emerald-500/10 text-emerald-200"
            : "border-slate-700/80 bg-slate-900/40 text-slate-400"
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
                className="flex items-center justify-between gap-2 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-[11px]"
              >
                <span className="truncate">{w.label}</span>
                <button
                  type="button"
                  onClick={() => onRemoveWorkout(w.id)}
                  className="rounded-full border border-slate-600 px-1 text-[10px] leading-none text-slate-300 hover:border-rose-500 hover:bg-rose-500/10 hover:text-rose-300"
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
    <div className="rounded-md border border-slate-800 bg-slate-950/80 p-2 text-[11px]">
      <div className="mb-1 flex items-center justify-between">
        <div className="font-semibold text-slate-100">{lane.name}</div>
        <span className="text-[10px] text-slate-500">
          From group: {lane.fromGroupName}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`mt-1 rounded-md border border-dashed px-2 py-2 text-[11px] ${
          isOver
            ? "border-emerald-500 bg-emerald-500/10 text-emerald-200"
            : "border-slate-700/80 bg-slate-900/40 text-slate-400"
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
                className="flex items-center justify-between gap-2 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-[11px]"
              >
                <span className="truncate">{w.label}</span>
                <button
                  type="button"
                  onClick={() => onRemoveWorkout(w.id)}
                  className="rounded-full border border-slate-600 px-1 text-[10px] leading-none text-slate-300 hover:border-rose-500 hover:bg-rose-500/10 hover:text-rose-300"
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
  teamId: string;
  seasonId: string;
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
  teamId,
  seasonId,
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
  if (!open) return null;

  const [showIndividualPanel, setShowIndividualPanel] = useState(false);
  const safeGroups = groups ?? [];

  const initialGroups: PracticeGroupUI[] =
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

    // Front-end validation: require at least one assigned workout (group or individual)
    const hasGroupWorkout = uiGroups.some(
      (g) => groupAssignments[g.name] && groupAssignments[g.name].length > 0
    );
    const hasIndividualWorkout = Object.values(individualAssignments).some(
      (workouts) => workouts && workouts.length > 0
    );

    if (!hasGroupWorkout && !hasIndividualWorkout) {
      window.alert(
        "Assign at least one group workout or one individual workout before saving."
      );
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        programId,
        teamId,
        seasonId,
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

      const res = await fetch("/api/practice/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error("[PracticeBuilderModal] Failed to save practice", res.status, res.statusText);
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-3 py-4"
      onClick={onClose}
    >
      <div
        className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
          <div className="space-y-1">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              Practice builder
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-100">
              <span className="font-semibold">
                {initialPractice ? "Edit practice" : "New practice"} – {displayDate}
              </span>
              <span className="rounded-full border border-slate-700/80 px-2 py-0.5 text-[11px] text-slate-300">
                Program: {programId}
              </span>
              <span className="rounded-full border border-slate-700/80 px-2 py-0.5 text-[11px] text-slate-300">
                Team: {teamId}
              </span>
              <span className="rounded-full border border-slate-700/80 px-2 py-0.5 text-[11px] text-slate-300">
                Season: {seasonId}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700/80 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-500 hover:text-slate-50"
          >
            Close
          </button>
        </div>

        {/* Practice info row */}
        <div className="border-b border-slate-800 px-5 py-3 text-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Practice label
              </label>
              <input
                type="text"
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                placeholder="e.g. Tempo Tuesday – 6x1k"
                value={practiceLabel}
                onChange={(e) => setPracticeLabel(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Date
              </label>
              <input
                type="date"
                value={practiceDate}
                onChange={(e) => setPracticeDate(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Start time
                </label>
                <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  End time
                </label>
                <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Location
              </label>
              <input
                type="text"
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                placeholder="Track, trails, weight room..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Notes
              </label>
              <textarea
                className="h-9 w-full resize-none rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
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
          <div className="flex flex-1 overflow-hidden">
            {/* Group assignment section */}
            <div className="flex min-w-[40%] flex-[2] flex-col border-r border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5">
                <div className="flex flex-col gap-0.5">
                  <div className="text-sm font-semibold text-slate-100">
                    Group assignments
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {uiGroups.length} group{uiGroups.length === 1 ? "" : "s"} •{" "}
                    {totalAthletes} athlete{totalAthletes === 1 ? "" : "s"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIndividualPanel((v) => !v)}
                  className="rounded-md border border-slate-700/80 px-2 py-1 text-[11px] text-slate-200 hover:border-emerald-500 hover:text-emerald-200"
                >
                  {showIndividualPanel
                    ? "Hide individual assignments"
                    : "Individual assignments ▸"}
                </button>
              </div>

              <div className="flex-1 overflow-auto px-4 py-3 text-sm">
                <div className="space-y-3">
                  {uiGroups.map((group) => (
                    <GroupTile
                      key={group.name}
                      group={group}
                      assignedWorkouts={groupAssignments[group.name] ?? []}
                      excludedAthleteIds={
                        excludedFromGroupWorkouts[group.name] ?? []
                      }
                      onRemoveWorkout={(workoutId) => {
                        setGroupAssignments((prev) => {
                          const existing = prev[group.name] ?? [];
                          return {
                            ...prev,
                            [group.name]: existing.filter(
                              (w) => w.id !== workoutId
                            ),
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
              <div className="flex w-72 flex-col border-r border-slate-800 bg-slate-950/95">
                <div className="border-b border-slate-800 px-3 py-2.5">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-slate-100">
                      Individual assignments
                    </div>
                    {individualLanes.length > 0 && (
                      <div className="text-[10px] text-slate-500">
                        {individualLanes.length} lane
                        {individualLanes.length === 1 ? "" : "s"}
                      </div>
                    )}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    Use the <span className="font-semibold">→</span> button on a
                    group athlete to create an individual lane, then drop
                    workouts here to override the group plan.
                  </div>
                </div>
                <div className="flex-1 overflow-auto px-3 py-2 text-sm">
                  {individualLanes.length === 0 ? (
                    <div className="rounded-md border border-dashed border-slate-700 bg-slate-900/40 p-2 text-[11px] text-slate-400">
                      No individual lanes yet. Use the{" "}
                      <span className="font-semibold">→</span> button on a
                      group athlete to create one.
                    </div>
                  ) : (
                    <div className="space-y-2 text-[11px] text-slate-300">
                      {individualLanes.map(
                        (lane: {
                          athleteId: string;
                          name: string;
                          fromGroupName: string;
                        }) => (
                          <IndividualLane
                            key={lane.athleteId}
                            lane={lane}
                            assignedWorkouts={
                              individualAssignments[lane.athleteId] ?? []
                            }
                            onRemoveWorkout={(workoutId) => {
                              setIndividualAssignments((prev) => {
                                const existing = prev[lane.athleteId] ?? [];
                                return {
                                  ...prev,
                                  [lane.athleteId]: existing.filter(
                                    (w) => w.id !== workoutId
                                  ),
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
            <div className="flex min-w-[28%] flex-1 flex-col bg-slate-950">
              <div className="flex border-b border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveLibraryTab("workouts")}
                  className={`flex-1 border-r border-slate-800 px-3 py-2.5 text-left ${
                    activeLibraryTab === "workouts"
                      ? "bg-slate-900 font-semibold text-slate-100"
                      : "text-slate-400 hover:text-slate-100"
                  }`}
                >
                  Workouts
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLibraryTab("events")}
                  className={`flex-1 px-3 py-2.5 text-left ${
                    activeLibraryTab === "events"
                      ? "bg-slate-900 font-semibold text-slate-100"
                      : "text-slate-400 hover:text-slate-100"
                  }`}
                >
                  Training events
                </button>
              </div>
              <div className="flex-1 overflow-auto px-3 py-2 text-sm">
                {activeLibraryTab === "workouts" ? (
                  <div className="space-y-2 text-[11px] text-slate-300">
                    {WORKOUT_LIBRARY.map((workout) => (
                      <DraggableWorkoutCard
                        key={workout.id}
                        workout={workout}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2 text-[11px] text-slate-300">
                    <div className="rounded-md border border-slate-800 bg-slate-900/70 p-3">
                      <div className="text-xs font-semibold text-slate-100">
                        Training events library
                      </div>
                      <div className="mt-1 text-[11px] text-slate-400">
                        Saved training event templates will appear here for
                        drag-and-drop onto groups and individual athletes.
                      </div>
                    </div>
                    <div className="rounded-md border border-dashed border-slate-700 bg-slate-900/40 p-3 text-[11px] text-slate-400">
                      Coming soon: integrate program-specific training event
                      templates from your library.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DragOverlay dropAnimation={null}>
            {activeWorkout ? (
              <div
                className={`rounded-md border border-emerald-400 bg-slate-900/95 p-2 shadow-xl ring-1 ring-emerald-500/60 transition-transform transition-opacity duration-150 ${
                  isDropping ? "scale-75 opacity-0" : "scale-100 opacity-100"
                }`}
              >
                <div className="text-xs font-semibold">
                  {activeWorkout.label}
                </div>
                <div className="text-[10px] text-slate-400">
                  {activeWorkout.description}
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {pendingMoveChoice && (
          <div className="fixed inset-0 z-[55] flex items-center justify-center bg-slate-950/70 px-3">
            <div className="w-full max-w-sm rounded-lg border border-slate-700 bg-slate-900 p-4 text-xs shadow-xl">
              <div className="mb-2 text-sm font-semibold text-slate-100">
                Adjust athlete assignment
              </div>
              <div className="mb-3 text-slate-300">
                What would you like to do with{" "}
                <span className="font-semibold">
                  {pendingMoveChoice.athleteName}
                </span>
                ?
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
                  className="w-full rounded-md bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-emerald-50 hover:bg-emerald-500"
                >
                  Move to individual assignments
                </button>
                <div className="text-[11px] text-slate-400">
                  Or move them into a different event group:
                </div>
                <div className="space-y-1">
                  {uiGroups
                    .filter(
                      (g) => g.name !== pendingMoveChoice.fromGroupName
                    )
                    .map((g) => (
                      <button
                        key={g.name}
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
                        className="w-full rounded-md border border-slate-700 px-3 py-1.5 text-[11px] text-slate-200 hover:border-emerald-500 hover:text-emerald-100"
                      >
                        Move to {g.name}
                      </button>
                    ))}
                  {uiGroups.filter(
                    (g) => g.name !== pendingMoveChoice.fromGroupName
                  ).length === 0 && (
                    <div className="text-[11px] text-slate-500">
                      No other groups available to move into.
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setPendingMoveChoice(null)}
                  className="rounded-md border border-slate-700 px-3 py-1.5 text-[11px] text-slate-300 hover:border-slate-500 hover:text-slate-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {pendingIndividual && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 px-3">
            <div className="w-full max-w-sm rounded-lg border border-slate-700 bg-slate-900 p-4 text-xs shadow-xl">
              <div className="mb-2 text-sm font-semibold text-slate-100">
                Remove from group workout?
              </div>
              <div className="mb-3 text-slate-300">
                {pendingIndividual.athleteName} has been moved into individual
                assignments. Do you want to remove them from their group
                workouts for this practice?
              </div>
              <div className="mb-3 text-[11px] text-slate-500">
                You can still assign custom work to this athlete in their
                individual lane regardless of this choice.
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPendingIndividual(null)}
                  className="rounded-md border border-slate-700 px-3 py-1.5 text-[11px] text-slate-300 hover:border-slate-500 hover:text-slate-100"
                >
                  Keep in group
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExcludedFromGroupWorkouts((prev) => {
                      const groupKey = pendingIndividual.fromGroupName;
                      const existing = prev[groupKey] ?? [];
                      if (existing.includes(pendingIndividual.athleteId)) {
                        return prev;
                      }
                      return {
                        ...prev,
                        [groupKey]: [
                          ...existing,
                          pendingIndividual.athleteId,
                        ],
                      };
                    });
                    setPendingIndividual(null);
                  }}
                  className="rounded-md bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-emerald-50 hover:bg-emerald-500"
                >
                  Remove from group
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950 px-5 py-3 text-xs">
          <div className="text-slate-500">
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
              className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-500 hover:text-slate-100"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-emerald-50 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                {isSaving ? "Saving..." : "Save practice"}
            </button>
          </div>
        </div>
        </div>
    </div>
  );
}