//app/programs/[programId]/teams/[teamId]/seasons/[seasonId]/practice/GroupAssignmentsDrawer.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

export type GroupAssignmentsDrawerProps = {
  open: boolean;
  onClose: () => void;
  programId: string;
  teamSeasonId: string;
  practiceId: string;
  groupId: string;
};

// Types here are intentionally minimal and can be aligned with your actual API responses.
type RosterAthlete = {
  id: string; // team_roster.id
  athlete_id: string;
  first_name: string;
  last_name: string;
  event_group: string | null;
  class_year: string | null;
};

type GroupAssignment = {
  id: string;
  practice_group_id: string;
  team_roster_id: string;
  athlete_id: string;
};

export default function GroupAssignmentsDrawer({
  open,
  onClose,
  programId,
  teamSeasonId,
  practiceId,
  groupId,
}: GroupAssignmentsDrawerProps) {
  const [roster, setRoster] = useState<RosterAthlete[]>([]);
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);

  const [assignments, setAssignments] = useState<GroupAssignment[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const [assignmentsError, setAssignmentsError] = useState<string | null>(null);

  const [isMutating, setIsMutating] = useState(false);
  const [search, setSearch] = useState("");
  const [eventGroupFilter, setEventGroupFilter] = useState<string>("all");

  // Early return when closed
  if (!open) return null;

  // ---------- Data fetching ----------

  async function fetchRoster() {
    setIsLoadingRoster(true);
    setRosterError(null);

    try {
      const res = await fetch(
        `/api/programs/${programId}/team-seasons/${teamSeasonId}/roster`
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load roster");
      }

      const body = (await res.json()) as { roster: RosterAthlete[] };
      setRoster(body.roster ?? []);
    } catch (err: any) {
      console.error("[GroupAssignmentsDrawer] fetchRoster error", err);
      setRosterError(err.message ?? "Failed to load roster");
    } finally {
      setIsLoadingRoster(false);
    }
  }

  async function fetchAssignments() {
    setIsLoadingAssignments(true);
    setAssignmentsError(null);

    try {
      const res = await fetch(
        `/api/programs/${programId}/training/practices/${practiceId}/groups/${groupId}/assignments`
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load assignments");
      }

      const body = (await res.json()) as { assignments: GroupAssignment[] };
      setAssignments(body.assignments ?? []);
    } catch (err: any) {
      console.error("[GroupAssignmentsDrawer] fetchAssignments error", err);
      setAssignmentsError(err.message ?? "Failed to load assignments");
    } finally {
      setIsLoadingAssignments(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    fetchRoster();
    fetchAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, programId, teamSeasonId, practiceId, groupId]);

  // ---------- Derived state ----------

  const assignedRosterIds = useMemo(
    () => new Set(assignments.map((a) => a.team_roster_id)),
    [assignments]
  );

  const filteredRoster = useMemo(() => {
    let list = roster;

    if (eventGroupFilter !== "all") {
      list = list.filter((r) => r.event_group === eventGroupFilter);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((r) => {
        const name = `${r.first_name} ${r.last_name}`.toLowerCase();
        return name.includes(q);
      });
    }

    return list;
  }, [roster, eventGroupFilter, search]);

  const assignedAthletes = useMemo(() => {
    const byId = roster.reduce<Record<string, RosterAthlete>>((acc, r) => {
      acc[r.id] = r;
      return acc;
    }, {});

    return assignments.map((a) => ({
      assignment: a,
      athlete: byId[a.team_roster_id] ?? null,
    }));
  }, [assignments, roster]);

  // ---------- Mutations ----------

  async function handleAddToGroup(athlete: RosterAthlete) {
    if (assignedRosterIds.has(athlete.id)) return; // already assigned

    setIsMutating(true);
    try {
      const res = await fetch(
        `/api/programs/${programId}/training/practices/${practiceId}/groups/${groupId}/assignments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            athletes: [
              {
                teamRosterId: athlete.id,
                athleteId: athlete.athlete_id,
              },
            ],
          }),
        }
      );

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(body.error || "Failed to add athlete to group");
      }

      const newAssignments = (body.assignments ?? []) as GroupAssignment[];

      if (Array.isArray(newAssignments) && newAssignments.length > 0) {
        setAssignments((prev) => [...prev, ...newAssignments]);
      } else {
        // Fallback: refetch
        await fetchAssignments();
      }
    } catch (err: any) {
      console.error("[GroupAssignmentsDrawer] handleAddToGroup error", err);
      setAssignmentsError(err.message ?? "Failed to add athlete");
    } finally {
      setIsMutating(false);
    }
  }

  async function handleRemoveAssignment(assignmentId: string) {
    setIsMutating(true);
    try {
      const res = await fetch(
        `/api/programs/${programId}/training/practices/${practiceId}/groups/${groupId}/assignments`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ assignmentIds: [assignmentId] }),
        }
      );

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(body.error || "Failed to remove athlete from group");
      }

      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
    } catch (err: any) {
      console.error("[GroupAssignmentsDrawer] handleRemoveAssignment error", err);
      setAssignmentsError(err.message ?? "Failed to remove athlete");
    } finally {
      setIsMutating(false);
    }
  }

  // ---------- Render ----------

  return (
    <div className="fixed bottom-4 right-4 z-40 w-[520px] max-w-full rounded-xl px-4 py-3 text-xs panel bg-panel/85 ring-1 ring-panel backdrop-blur-xl shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            Group assignments
          </div>
          <div className="text-[11px] text-[var(--muted-foreground)]">
            Assign roster athletes to this practice group.
          </div>
        </div>
        <button
          className="text-[11px] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          onClick={onClose}
        >
          Close
        </button>
      </div>

      <div className="mb-2 flex gap-2">
        <input
          className="flex-1 rounded-md px-2 py-1 text-[11px] text-[var(--foreground)] outline-none ring-1 ring-panel bg-panel-muted placeholder:text-[var(--muted-foreground)]/60 focus:ring-2 focus:ring-[color:var(--brand)]/40"
          placeholder="Search roster by name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="w-32 rounded-md px-2 py-1 text-[11px] text-[var(--foreground)] outline-none ring-1 ring-panel bg-panel-muted focus:ring-2 focus:ring-[color:var(--brand)]/40"
          value={eventGroupFilter}
          onChange={(e) => setEventGroupFilter(e.target.value)}
        >
          <option value="all">All groups</option>
          <option value="distance">Distance</option>
          <option value="mid">Mid</option>
          <option value="sprint">Sprint</option>
          <option value="throws">Throws</option>
          <option value="jumps">Jumps</option>
        </select>
      </div>

      <div className="mb-2 flex gap-2 text-[11px]">
        {rosterError && <span className="text-red-400">Roster: {rosterError}</span>}
        {assignmentsError && (
          <span className="text-red-400">Assignments: {assignmentsError}</span>
        )}
      </div>

      <div className="flex gap-3">
        {/* Roster column */}
        <div className="flex-1 rounded-lg p-2 ring-1 ring-panel bg-panel-muted">
          <div className="mb-1 flex items-center justify-between text-[11px] text-[var(--muted-foreground)]">
            <span>Roster</span>
            {isLoadingRoster && <span>Loading…</span>}
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {roster.length === 0 && !isLoadingRoster ? (
              <div className="text-[11px] text-[var(--muted-foreground)]">
                No roster athletes found for this team season.
              </div>
            ) : (
              filteredRoster.map((athlete) => {
                const isAssigned = assignedRosterIds.has(athlete.id);
                const name = `${athlete.first_name} ${athlete.last_name}`;
                return (
                  <button
                    key={athlete.id}
                    type="button"
                    disabled={isAssigned || isMutating}
                    onClick={() => handleAddToGroup(athlete)}
                    className={`flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-[11px] ring-1 ${
                      isAssigned
                        ? "cursor-not-allowed ring-panel bg-panel text-[var(--muted-foreground)] opacity-70"
                        : "ring-panel bg-panel-muted text-[var(--foreground)] hover:bg-panel"
                    }`}
                  >
                    <span className="truncate">{name}</span>
                    <span className="ml-2 flex gap-1 text-[10px] text-[var(--muted-foreground)]">
                      {athlete.event_group && (
                        <span className="rounded bg-panel px-1 ring-1 ring-panel">
                          {athlete.event_group}
                        </span>
                      )}
                      {athlete.class_year && (
                        <span className="rounded bg-panel px-1 ring-1 ring-panel">
                          {athlete.class_year}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Assigned column */}
        <div className="flex-1 rounded-lg p-2 ring-1 ring-panel bg-panel-muted">
          <div className="mb-1 flex items-center justify-between text-[11px] text-[var(--muted-foreground)]">
            <span>Assigned to group</span>
            {isLoadingAssignments && <span>Loading…</span>}
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {assignedAthletes.length === 0 && !isLoadingAssignments ? (
              <div className="text-[11px] text-[var(--muted-foreground)]">
                No athletes assigned yet.
              </div>
            ) : (
              assignedAthletes.map(({ assignment, athlete }) => {
                const name = athlete
                  ? `${athlete.first_name} ${athlete.last_name}`
                  : "Unknown athlete";
                return (
                  <button
                    key={assignment.id}
                    type="button"
                    disabled={isMutating}
                    onClick={() => handleRemoveAssignment(assignment.id)}
                    className="flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-[11px] ring-1 ring-panel bg-panel-muted text-[var(--foreground)] hover:bg-panel"
                  >
                    <span className="truncate">{name}</span>
                    <span className="ml-2 text-[10px] text-[var(--muted-foreground)]">Remove</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
