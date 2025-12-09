"use client";
//app/programs/[programId]/teams/[teamId]/seasons/[seasonId]/practice/PracticePageClient.tsx
import { useEffect, useMemo, useState } from "react";
import GroupAssignmentsDrawer from "./GroupAssignmentsDrawer";

type PracticeSummary = {
  id: string;
  program_id: string;
  team_season_id: string;
  practice_date: string; // YYYY-MM-DD
  label: string;
  created_at: string;
};

type PracticeWithGroups = {
  id: string;
  program_id: string;
  team_season_id: string;
  practice_date: string;
  label: string;
  created_at: string;
  groups: Array<{
    id: string;
    practice_plan_id: string;
    label: string;
    event_group: string | null;
    workout_id: string | null;
    athleteCount: number;
  }>;
};

type DateRange = {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
};

type PracticePageClientProps = {
  programId: string;
  teamId: string;
  teamSeasonId: string;
};

function getInitialDateRange(): DateRange {
  const today = new Date();
  const from = new Date(today);
  from.setDate(today.getDate() - 3);
  const to = new Date(today);
  to.setDate(today.getDate() + 3);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(from), to: fmt(to) };
}

export default function PracticePageClient({
  programId,
  teamId,
  teamSeasonId,
}: PracticePageClientProps) {
  const [dateRange, setDateRange] = useState<DateRange>(() => getInitialDateRange());
  const [practices, setPractices] = useState<PracticeSummary[]>([]);
  const [isLoadingPractices, setIsLoadingPractices] = useState(false);
  const [practicesError, setPracticesError] = useState<string | null>(null);

  const [selectedPracticeId, setSelectedPracticeId] = useState<string | null>(null);
  const [practiceDetail, setPracticeDetail] = useState<PracticeWithGroups | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [isGeneratingSessions, setIsGeneratingSessions] = useState(false);
  const [generateMessage, setGenerateMessage] = useState<string | null>(null);

  // Group creation state
  const [showAddGroupForm, setShowAddGroupForm] = useState(false);
  const [newGroupLabel, setNewGroupLabel] = useState("");
  const [newGroupEventGroup, setNewGroupEventGroup] = useState("");
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);

  // Group assignments drawer state (stub for now)
  const [activeGroupForAssignments, setActiveGroupForAssignments] = useState<string | null>(null);

  // ------- Data fetching helpers -------

  async function fetchPractices(range: DateRange) {
    setIsLoadingPractices(true);
    setPracticesError(null);

    try {
      const params = new URLSearchParams({
        teamSeasonId,
        from: range.from,
        to: range.to,
      });

      const res = await fetch(
        `/api/programs/${programId}/training/practices?` + params.toString()
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load practices");
      }

      const data = (await res.json()) as { practices: PracticeSummary[] };
      setPractices(data.practices ?? []);

      // If nothing selected, auto-select the first in range
      if (!selectedPracticeId && data.practices && data.practices.length > 0) {
        setSelectedPracticeId(data.practices[0].id);
      }
    } catch (err: any) {
      console.error("[PracticePageClient] fetchPractices error", err);
      setPracticesError(err.message ?? "Failed to load practices");
    } finally {
      setIsLoadingPractices(false);
    }
  }

  async function fetchPracticeDetail(practiceId: string | null) {
    if (!practiceId) {
      setPracticeDetail(null);
      setDetailError(null);
      return;
    }

    setIsLoadingDetail(true);
    setDetailError(null);

    try {
      const res = await fetch(
        `/api/programs/${programId}/training/practices/${practiceId}`
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load practice details");
      }

      const data = (await res.json()) as { practice: PracticeWithGroups };
      setPracticeDetail(data.practice);
    } catch (err: any) {
      console.error("[PracticePageClient] fetchPracticeDetail error", err);
      setDetailError(err.message ?? "Failed to load practice details");
      setPracticeDetail(null);
    } finally {
      setIsLoadingDetail(false);
    }
  }

  async function handleGenerateSessions() {
    if (!selectedPracticeId) return;

    setIsGeneratingSessions(true);
    setGenerateMessage(null);

    try {
      const res = await fetch(
        `/api/programs/${programId}/training/practices/${selectedPracticeId}/generate-sessions`,
        {
          method: "POST",
        }
      );

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(body.error || "Failed to generate sessions");
      }

      const msg =
        typeof body.message === "string"
          ? body.message
          : `Created ${body.createdCount ?? 0} sessions`;
      setGenerateMessage(msg);

      // Optionally refresh detail after generating
      await fetchPracticeDetail(selectedPracticeId);
    } catch (err: any) {
      console.error("[PracticePageClient] handleGenerateSessions error", err);
      setGenerateMessage(err.message ?? "Failed to generate sessions");
    } finally {
      setIsGeneratingSessions(false);
    }
  }

  async function handleCreateGroupSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedPracticeId) return;
    if (!newGroupLabel.trim()) {
      setGroupError("Group label is required");
      return;
    }

    setIsCreatingGroup(true);
    setGroupError(null);

    try {
      const res = await fetch(
        `/api/programs/${programId}/training/practices/${selectedPracticeId}/groups`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            label: newGroupLabel.trim(),
            eventGroup: newGroupEventGroup.trim() || null,
            workoutId: null,
          }),
        }
      );

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(body.error || "Failed to create group");
      }

      // Clear form and hide it
      setNewGroupLabel("");
      setNewGroupEventGroup("");
      setShowAddGroupForm(false);

      // Refresh practice detail so the new group appears
      await fetchPracticeDetail(selectedPracticeId);
    } catch (err: any) {
      console.error("[PracticePageClient] handleCreateGroupSubmit error", err);
      setGroupError(err.message ?? "Failed to create group");
    } finally {
      setIsCreatingGroup(false);
    }
  }

  // ------- Effects -------

  // Load practices when date range changes
  useEffect(() => {
    fetchPractices(dateRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange.from, dateRange.to, programId, teamSeasonId]);

  // Load detail when selection changes
  useEffect(() => {
    fetchPracticeDetail(selectedPracticeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPracticeId, programId]);

  // ------- Derived state -------

  const selectedPractice = useMemo(
    () => practices.find((p) => p.id === selectedPracticeId) || null,
    [practices, selectedPracticeId]
  );

  // ------- UI handlers -------

  function handleSelectPractice(id: string) {
    setSelectedPracticeId(id);
  }

  function handleChangeWeek(offsetDays: number) {
    setDateRange((prev) => {
      const fromDate = new Date(prev.from);
      const toDate = new Date(prev.to);
      fromDate.setDate(fromDate.getDate() + offsetDays);
      toDate.setDate(toDate.getDate() + offsetDays);
      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      return { from: fmt(fromDate), to: fmt(toDate) };
    });
  }

  // ------- Render -------

  return (
    <div className="flex h-full gap-4">
      {/* Left pane: practices list / calendar */}
      <section className="w-1/3 border-r border-slate-800 pr-4 flex flex-col">
        <header className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Practice Schedule</h2>
            <p className="text-xs text-slate-400">
              Team season: <span className="font-mono">{teamSeasonId}</span>
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <button
              className="rounded border border-slate-700 px-2 py-1"
              onClick={() => handleChangeWeek(-7)}
            >
              ◀ Prev
            </button>
            <button
              className="rounded border border-slate-700 px-2 py-1"
              onClick={() => setDateRange(getInitialDateRange())}
            >
              Today
            </button>
            <button
              className="rounded border border-slate-700 px-2 py-1"
              onClick={() => handleChangeWeek(7)}
            >
              Next ▶
            </button>
          </div>
        </header>

        <div className="mb-2 text-xs text-slate-400">
          Range: {dateRange.from} → {dateRange.to}
        </div>

        {isLoadingPractices && (
          <div className="text-xs text-slate-400">Loading practices…</div>
        )}
        {practicesError && (
          <div className="text-xs text-red-400">Error: {practicesError}</div>
        )}

        <div className="mt-2 flex-1 overflow-y-auto space-y-1 text-sm">
          {practices.length === 0 && !isLoadingPractices ? (
            <div className="text-xs text-slate-500">
              No practices in this range. Use the controls above to change dates or create a
              new practice (hook this up later).
            </div>
          ) : (
            practices.map((p) => {
              const isSelected = p.id === selectedPracticeId;
              return (
                <button
                  key={p.id}
                  onClick={() => handleSelectPractice(p.id)}
                  className={[
                    "w-full rounded px-2 py-1 text-left text-xs",
                    isSelected
                      ? "bg-sky-800/60 border border-sky-500 text-sky-50"
                      : "bg-slate-900/40 border border-slate-800 text-slate-200 hover:bg-slate-800/60",
                  ].join(" ")}
                >
                  <div className="flex justify-between">
                    <span className="font-medium">{p.label}</span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {p.practice_date}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </section>

      {/* Right pane: practice detail */}
      <section className="flex-1 flex flex-col">
        {!selectedPracticeId ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            Select a practice on the left to view details.
          </div>
        ) : (
          <>
            <header className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-200">
                  {practiceDetail?.label ?? selectedPractice?.label ?? "Practice"}
                </h2>
                <p className="text-xs text-slate-400">
                  Date:{" "}
                  <span className="font-mono">
                    {practiceDetail?.practice_date ?? selectedPractice?.practice_date}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {generateMessage && (
                  <span className="text-slate-400">{generateMessage}</span>
                )}
                <button
                  className="rounded border border-slate-700 px-2 py-1 disabled:opacity-50"
                  onClick={handleGenerateSessions}
                  disabled={isGeneratingSessions}
                >
                  {isGeneratingSessions ? "Generating…" : "Generate Sessions"}
                </button>
              </div>
            </header>

            {isLoadingDetail && (
              <div className="text-xs text-slate-400">Loading practice details…</div>
            )}
            {detailError && (
              <div className="text-xs text-red-400">Error: {detailError}</div>
            )}

            {!isLoadingDetail && practiceDetail && (
              <div className="flex-1 overflow-y-auto">
                {/* Groups section */}
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Groups
                  </h3>
                  <button
                    className="rounded border border-slate-700 px-2 py-1 text-xs"
                    onClick={() => setShowAddGroupForm((prev) => !prev)}
                  >
                    {showAddGroupForm ? "Cancel" : "+ Add Group"}
                  </button>
                </div>

                {showAddGroupForm && (
                  <form
                    onSubmit={handleCreateGroupSubmit}
                    className="mb-3 flex flex-col gap-2 rounded border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs"
                  >
                    {groupError && (
                      <div className="text-[11px] text-red-400">{groupError}</div>
                    )}
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="mb-1 block text-[11px] text-slate-400">
                          Group label
                        </label>
                        <input
                          className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 outline-none"
                          value={newGroupLabel}
                          onChange={(e) => setNewGroupLabel(e.target.value)}
                          placeholder="e.g., Distance – Group A"
                        />
                      </div>
                      <div className="w-40">
                        <label className="mb-1 block text-[11px] text-slate-400">
                          Event group
                        </label>
                        <input
                          className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 outline-none"
                          value={newGroupEventGroup}
                          onChange={(e) => setNewGroupEventGroup(e.target.value)}
                          placeholder="e.g., distance"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="rounded border border-slate-700 px-2 py-1 text-[11px]"
                        onClick={() => {
                          setShowAddGroupForm(false);
                          setNewGroupLabel("");
                          setNewGroupEventGroup("");
                          setGroupError(null);
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="rounded border border-sky-500 px-2 py-1 text-[11px] text-sky-100 disabled:opacity-50"
                        disabled={isCreatingGroup}
                      >
                        {isCreatingGroup ? "Creating…" : "Create Group"}
                      </button>
                    </div>
                  </form>
                )}

                {practiceDetail.groups.length === 0 ? (
                  <div className="text-xs text-slate-500">
                    No groups yet. Use “+ Add Group” to create your first group for this practice.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {practiceDetail.groups.map((g) => (
                      <div
                        key={g.id}
                        className="rounded border border-slate-800 bg-slate-900/40 px-3 py-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-slate-100">{g.label}</div>
                            <div className="mt-0.5 flex gap-2 text-[11px] text-slate-400">
                              {g.event_group && (
                                <span className="rounded bg-slate-800 px-1.5 py-0.5">
                                  {g.event_group}
                                </span>
                              )}
                              <span className="rounded bg-slate-800 px-1.5 py-0.5">
                                {g.athleteCount} athletes
                              </span>
                              {g.workout_id && (
                                <span className="rounded bg-slate-800 px-1.5 py-0.5">
                                  Workout: {g.workout_id.slice(0, 8)}…
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <button
                              className="text-[11px] text-sky-400 hover:underline"
                              onClick={() => setActiveGroupForAssignments(g.id)}
                            >
                              Manage Athletes
                            </button>
                            <button className="text-[11px] text-slate-400 hover:underline">
                              Edit Group
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {activeGroupForAssignments && (
          <div className="fixed bottom-4 right-4 max-w-md rounded border border-slate-800 bg-slate-950/95 px-4 py-3 text-xs shadow-lg">
            <div className="mb-2 flex items-center justify-between">
              <div className="font-semibold text-slate-100">Group assignments (stub)</div>
              <button
                className="text-[11px] text-slate-400 hover:underline"
                onClick={() => setActiveGroupForAssignments(null)}
              >
                Close
              </button>
            </div>
            <div className="text-[11px] text-slate-400">
              {activeGroupForAssignments && selectedPracticeId && (
                <GroupAssignmentsDrawer
                    open={true}
                    onClose={() => setActiveGroupForAssignments(null)}
                    programId={programId}
                    teamSeasonId={teamSeasonId}
                    practiceId={selectedPracticeId}
                    groupId={activeGroupForAssignments}
                />
)}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}