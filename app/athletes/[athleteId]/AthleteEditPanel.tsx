"use client";

import { useEffect, useState } from "react";

type AthleteEditPanelProps = {
  athleteId: string;
  initialBio: string;
  initialGpa: number | null;
  initialTestScores: any | null; // { sat?: number; act?: number }
};

type TabKey = "profile" | "training" | "media";

type TrainingSession = {
  id: string;
  source: "coach_assigned" | "self_assigned";
  coach_member_id: string | null;
  team_season_id: string | null;
  scheduled_date: string | null;
  completed_at: string | null;
  workout_category: "run" | "gym" | "cross_training" | "other";
  title: string | null;
  planned_description: string | null;
  planned_distance_m: number | null;
  planned_duration_sec: number | null;
  planned_rpe: number | null;
  actual_distance_m: number | null;
  actual_duration_sec: number | null;
  actual_rpe: number | null;
  actual_description: string | null;
};

export function AthleteEditPanel({
  athleteId,
  initialBio,
  initialGpa,
  initialTestScores,
}: AthleteEditPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("profile");

  // PROFILE STATE
  const [bio, setBio] = useState(initialBio ?? "");
  const [gpa, setGpa] = useState(initialGpa != null ? String(initialGpa) : "");
  const [sat, setSat] = useState(
    initialTestScores?.sat != null ? String(initialTestScores.sat) : ""
  );
  const [act, setAct] = useState(
    initialTestScores?.act != null ? String(initialTestScores.act) : ""
  );
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);

  // TRAINING STATE
  const [trainingSessions, setTrainingSessions] = useState<TrainingSession[]>([]);
  const [loadingTraining, setLoadingTraining] = useState(false);
  const [trainingError, setTrainingError] = useState<string | null>(null);
  const [creatingSession, setCreatingSession] = useState(false);

  // Derive upcoming coach-assigned sessions (today and forward)
  // and recent sessions (last 7 days) from the full trainingSessions list.
  const todayStr = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);

  const getSessionDate = (session: TrainingSession) =>
    session.scheduled_date ??
    (session.completed_at ? session.completed_at.slice(0, 10) : null);

  const assignedSessions = trainingSessions.filter((s) => {
    const date = getSessionDate(s);
    return s.source === "coach_assigned" && date !== null && date >= todayStr;
  });

  const recentSessions = trainingSessions.filter((s) => {
    const date = getSessionDate(s);
    if (!date) return false;
    return date >= sevenDaysAgoStr && date <= todayStr;
  });

  // New session quick-log form
  const today = new Date().toISOString().slice(0, 10);
  const [newDate, setNewDate] = useState<string>(today);
  const [newCategory, setNewCategory] = useState<TrainingSession["workout_category"]>("run");
  const [newTitle, setNewTitle] = useState("");
  const [newDistance, setNewDistance] = useState("");
  const [newDuration, setNewDuration] = useState("");
  const [newRpe, setNewRpe] = useState("");
  const [newNotes, setNewNotes] = useState("");

  // Load training when you flip to the Training tab
  useEffect(() => {
    if (activeTab !== "training") return;
    void loadTrainingSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, athleteId]);

  async function loadTrainingSessions() {
    setLoadingTraining(true);
    setTrainingError(null);
    try {
      const res = await fetch(`/api/athletes/${athleteId}/training`, {
        method: "GET",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error("Failed to load training sessions", body);
        setTrainingError(body.error || "Failed to load training sessions");
        setTrainingSessions([]);
        return;
      }
      const body = await res.json();
      const allSessions: TrainingSession[] = body.sessions ?? [];

      // Store the full set of sessions; filtering for coach-assigned vs recent
      // is handled in derived arrays so we can have different windows.
      setTrainingSessions(
        allSessions.sort((a, b) => {
          const da = a.scheduled_date || a.completed_at || "";
          const db = b.scheduled_date || b.completed_at || "";
          return db.localeCompare(da);
        })
      );
    } catch (err) {
      console.error("Failed to load training sessions", err);
      setTrainingError("Failed to load training sessions");
    } finally {
      setLoadingTraining(false);
    }
  }

  async function handleCreateSession(e: React.FormEvent) {
    e.preventDefault();
    setCreatingSession(true);
    setTrainingError(null);

    const payload: any = {
      workout_category: newCategory,
      title: newTitle || null,
      date: newDate || null,
      // Quick entry: distance in miles → store as meters
      actual_distance_m: newDistance ? Number(newDistance) * 1609.34 : null,
      // Quick entry: minutes → store as seconds
      actual_duration_sec: newDuration ? Number(newDuration) * 60 : null,
      actual_rpe: newRpe ? Number(newRpe) : null,
      actual_description: newNotes || null,
    };

    try {
      const res = await fetch(`/api/athletes/${athleteId}/training`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error("Failed to create training session", body);
        setTrainingError(body.error || "Failed to create session");
        return;
      }

      const body = await res.json();
      const created: TrainingSession = body.session;

      setTrainingSessions((prev) =>
        [created, ...prev].sort((a, b) => {
          const da = a.scheduled_date || a.completed_at || "";
          const db = b.scheduled_date || b.completed_at || "";
          return db.localeCompare(da);
        })
      );

      // Reset form
      setNewTitle("");
      setNewDistance("");
      setNewDuration("");
      setNewRpe("");
      setNewNotes("");
      setNewCategory("run");
      setNewDate(today);
    } catch (err) {
      console.error("Failed to create training session", err);
      setTrainingError("Failed to create session");
    } finally {
      setCreatingSession(false);
    }
  }

  async function handleMarkComplete(sessionId: string) {
    try {
      const res = await fetch(`/api/athletes/${athleteId}/training/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mark_complete: true }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error("Failed to update training session", body);
        setTrainingError(body.error || "Failed to update session");
        return;
      }

      const body = await res.json();
      const updated: TrainingSession = body.session;

      setTrainingSessions((prev) =>
        prev
          .map((s) => (s.id === updated.id ? updated : s))
          .sort((a, b) => {
            const da = a.scheduled_date || a.completed_at || "";
            const db = b.scheduled_date || b.completed_at || "";
            return db.localeCompare(da);
          })
      );
    } catch (err) {
      console.error("Failed to update training session", err);
      setTrainingError("Failed to update session");
    }
  }

  async function handleSaveProfile() {
    setSavingProfile(true);
    setProfileError(null);
    setProfileSaved(false);

    const payload: any = {
      bio,
      gpa: gpa ? Number(gpa) : null,
      test_scores: {
        sat: sat ? Number(sat) : undefined,
        act: act ? Number(act) : undefined,
      },
    };

    if (!payload.test_scores.sat && !payload.test_scores.act) {
      payload.test_scores = null;
    }

    const res = await fetch(`/api/athletes/${athleteId}/profile`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.error("Profile save failed", body);
      setProfileError(body.error || "Failed to save profile");
      setSavingProfile(false);
      return;
    }

    setSavingProfile(false);
    setProfileSaved(true);
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: "profile", label: "Profile" },
    { key: "training", label: "Training" },
    { key: "media", label: "Media" },
  ];

  return (
    <aside className="flex h-full flex-col rounded-2xl bg-slate-950/90 p-3 ring-1 ring-slate-800">
      {/* Header + tabs */}
      <div className="mb-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-200">
          Athlete Tools
        </h2>
        <div className="mt-2 flex gap-1 rounded-full bg-slate-900/80 p-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={[
                "flex-1 rounded-full px-2 py-1 text-[11px] font-medium transition-colors",
                activeTab === tab.key
                  ? "bg-slate-100 text-slate-950"
                  : "text-slate-300 hover:bg-slate-800",
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 space-y-4 overflow-y-auto pb-3">
        {/* PROFILE TAB */}
        {activeTab === "profile" && (
          <>
            <div className="rounded-2xl bg-slate-900/80 p-3 ring-1 ring-slate-800">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                Academics
              </h3>
              <label className="mt-2 block text-xs text-slate-400">
                GPA
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="5"
                  value={gpa}
                  onChange={(e) => setGpa(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 outline-none focus:border-slate-400"
                />
              </label>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="block text-xs text-slate-400">
                  SAT
                  <input
                    type="number"
                    value={sat}
                    onChange={(e) => setSat(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 outline-none focus:border-slate-400"
                  />
                </label>
                <label className="block text-xs text-slate-400">
                  ACT
                  <input
                    type="number"
                    value={act}
                    onChange={(e) => setAct(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 outline-none focus:border-slate-400"
                  />
                </label>
              </div>
              <p className="mt-2 text-[10px] text-slate-500">
                These values are self-reported and visible to college coaches on your profile.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-900/80 p-3 ring-1 ring-slate-800">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                Bio &amp; Story
              </h3>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={6}
                className="mt-2 w-full resize-none rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 outline-none focus:border-slate-400"
                placeholder="Share your journey, goals, and what you're looking for in a college program."
              />
              <p className="mt-2 text-[10px] text-slate-500">
                Use this space to introduce yourself to coaches in your own words.
              </p>
            </div>
          </>
        )}

        {/* TRAINING TAB */}
        {activeTab === "training" && (
          <div className="space-y-3">
            {/* Quick log */}
            <div className="rounded-2xl bg-slate-900/80 p-3 ring-1 ring-slate-800">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                Quick Log
              </h3>
              <p className="mt-1 text-[11px] text-slate-400">
                Use this to quickly log today&apos;s run, gym session, or cross-training.
                Coach-assigned sessions will show in the list below.
              </p>

              <form className="mt-2 space-y-2" onSubmit={handleCreateSession}>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-[11px] text-slate-400">
                    Date
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-slate-400"
                    />
                  </label>
                  <label className="block text-[11px] text-slate-400">
                    Type
                    <select
                      value={newCategory}
                      onChange={(e) =>
                        setNewCategory(e.target.value as TrainingSession["workout_category"])
                      }
                      className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-slate-400"
                    >
                      <option value="run">Run</option>
                      <option value="gym">Gym</option>
                      <option value="cross_training">Cross-training</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                </div>

                <label className="block text-[11px] text-slate-400">
                  Title
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Easy run, Leg day A"
                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-slate-400"
                  />
                </label>

                <div className="grid grid-cols-3 gap-2">
                  <label className="block text-[11px] text-slate-400">
                    Distance (mi)
                    <input
                      type="number"
                      step="0.01"
                      value={newDistance}
                      onChange={(e) => setNewDistance(e.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-slate-400"
                    />
                  </label>
                  <label className="block text-[11px] text-slate-400">
                    Duration (min)
                    <input
                      type="number"
                      step="1"
                      value={newDuration}
                      onChange={(e) => setNewDuration(e.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-slate-400"
                    />
                  </label>
                  <label className="block text-[11px] text-slate-400">
                    RPE
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={newRpe}
                      onChange={(e) => setNewRpe(e.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-slate-400"
                    />
                  </label>
                </div>

                <label className="block text-[11px] text-slate-400">
                  Notes
                  <textarea
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    rows={2}
                    className="mt-1 w-full resize-none rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-slate-400"
                    placeholder="How did it feel? Any details you want to remember."
                  />
                </label>

                <div className="mt-1 flex justify-end">
                  <button
                    type="submit"
                    disabled={creatingSession}
                    className="inline-flex items-center rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-semibold text-slate-950 shadow-sm transition hover:bg-emerald-400 disabled:opacity-60"
                  >
                    {creatingSession ? "Logging..." : "Log Session"}
                  </button>
                </div>
              </form>
            </div>

            {/* Coach-assigned sessions */}
            <div className="rounded-2xl bg-slate-900/80 p-3 ring-1 ring-slate-800">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Coach-Assigned Sessions
                </h3>
                {loadingTraining && (
                  <span className="text-[10px] text-slate-500">Loading…</span>
                )}
              </div>

              {trainingError && (
                <p className="mt-2 text-[11px] text-red-400">{trainingError}</p>
              )}

              {!loadingTraining && assignedSessions.length === 0 && !trainingError && (
                <p className="mt-2 text-[11px] text-slate-400">
                  No coach-assigned sessions yet.
                </p>
              )}

              <div className="mt-2 space-y-2">
                {assignedSessions.map((session) => {
                  const isCompleted = !!session.completed_at;
                  const dateLabel =
                    session.scheduled_date ??
                    (session.completed_at ? session.completed_at.slice(0, 10) : null);

                  return (
                    <div
                      key={session.id}
                      className="rounded-xl bg-slate-950/80 px-3 py-2 text-[11px] text-slate-100 ring-1 ring-slate-800"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] uppercase tracking-wide text-slate-400">
                              {session.workout_category === "run"
                                ? "Run"
                                : session.workout_category === "gym"
                                ? "Gym"
                                : session.workout_category === "cross_training"
                                ? "Cross-training"
                                : "Other"}
                            </span>
                            <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[9px] font-medium text-sky-300">
                              Coach
                            </span>
                            {isCompleted && (
                              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-medium text-emerald-300">
                                Completed
                              </span>
                            )}
                          </div>
                          {session.title && (
                            <div className="mt-0.5 text-[11px] font-medium">
                              {session.title}
                            </div>
                          )}
                          {dateLabel && (
                            <div className="text-[10px] text-slate-500">
                              {dateLabel}
                            </div>
                          )}
                          {(session.planned_distance_m ||
                            session.planned_duration_sec ||
                            session.planned_rpe) && (
                            <div className="mt-0.5 text-[10px] text-slate-400">
                              {session.planned_distance_m
                                ? `${(session.planned_distance_m / 1609.34).toFixed(1)} mi planned`
                                : null}
                              {session.planned_distance_m && session.planned_duration_sec
                                ? " · "
                                : null}
                              {session.planned_duration_sec
                                ? `${Math.round(
                                    session.planned_duration_sec / 60
                                  )} min`
                                : null}
                              {session.planned_rpe
                                ? ` · RPE ${session.planned_rpe}`
                                : null}
                            </div>
                          )}
                          {session.planned_description && (
                            <div className="mt-0.5 text-[10px] text-slate-400">
                              {session.planned_description}
                            </div>
                          )}
                        </div>
                        {!isCompleted && (
                          <button
                            type="button"
                            onClick={() => handleMarkComplete(session.id)}
                            className="mt-1 rounded-full bg-emerald-500/90 px-2 py-1 text-[9px] font-semibold text-slate-950 shadow-sm transition hover:bg-emerald-400"
                          >
                            Mark Done
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent sessions (all sources) */}
            <div className="rounded-2xl bg-slate-900/80 p-3 ring-1 ring-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                    Recent Sessions
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    Showing last 7 days
                  </p>
                </div>
                {loadingTraining && (
                  <span className="text-[10px] text-slate-500">Loading…</span>
                )}
              </div>

              {trainingError && (
                <p className="mt-2 text-[11px] text-red-400">{trainingError}</p>
              )}

              {!loadingTraining && recentSessions.length === 0 && !trainingError && (
                <p className="mt-2 text-[11px] text-slate-400">
                  No training sessions logged yet.
                </p>
              )}

              <div className="mt-2 space-y-2">
                {recentSessions.map((session) => {
                  const isCoach = session.source === "coach_assigned";
                  const isCompleted = !!session.completed_at;
                  const dateLabel =
                    session.scheduled_date ??
                    (session.completed_at ? session.completed_at.slice(0, 10) : null);

                  return (
                    <div
                      key={session.id}
                      className="rounded-xl bg-slate-950/80 px-3 py-2 text-[11px] text-slate-100 ring-1 ring-slate-800"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] uppercase tracking-wide text-slate-400">
                              {session.workout_category === "run"
                                ? "Run"
                                : session.workout_category === "gym"
                                ? "Gym"
                                : session.workout_category === "cross_training"
                                ? "Cross-training"
                                : "Other"}
                            </span>
                            <span
                              className={
                                "rounded-full px-2 py-0.5 text-[9px] font-medium " +
                                (isCoach
                                  ? "bg-sky-500/20 text-sky-300"
                                  : "bg-emerald-500/20 text-emerald-300")
                              }
                            >
                              {isCoach ? "Coach" : "Self"}
                            </span>
                            {isCompleted && (
                              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-medium text-emerald-300">
                                Completed
                              </span>
                            )}
                          </div>
                          {session.title && (
                            <div className="mt-0.5 text-[11px] font-medium">
                              {session.title}
                            </div>
                          )}
                          {dateLabel && (
                            <div className="text-[10px] text-slate-500">
                              {dateLabel}
                            </div>
                          )}
                          {(session.actual_distance_m ||
                            session.actual_duration_sec ||
                            session.actual_rpe) && (
                            <div className="mt-0.5 text-[10px] text-slate-400">
                              {session.actual_distance_m
                                ? `${(session.actual_distance_m / 1609.34).toFixed(1)} mi`
                                : null}
                              {session.actual_distance_m && session.actual_duration_sec
                                ? " · "
                                : null}
                              {session.actual_duration_sec
                                ? `${Math.round(
                                    session.actual_duration_sec / 60
                                  )} min`
                                : null}
                              {session.actual_rpe
                                ? ` · RPE ${session.actual_rpe}`
                                : null}
                            </div>
                          )}
                          {session.actual_description && (
                            <div className="mt-0.5 text-[10px] text-slate-400">
                              {session.actual_description}
                            </div>
                          )}
                        </div>
                        {!isCompleted && (
                          <button
                            type="button"
                            onClick={() => handleMarkComplete(session.id)}
                            className="mt-1 rounded-full bg-emerald-500/90 px-2 py-1 text-[9px] font-semibold text-slate-950 shadow-sm transition hover:bg-emerald-400"
                          >
                            Mark Done
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* MEDIA TAB (placeholder for now) */}
        {activeTab === "media" && (
          <div className="rounded-2xl bg-slate-900/80 p-3 ring-1 ring-slate-800">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              Media (Coming Soon)
            </h3>
            <p className="mt-2 text-[11px] text-slate-400">
              This tab will connect to your highlight reel and action shots so you can manage
              captions and ordering without leaving this page.
            </p>
          </div>
        )}
      </div>

      {/* Footer actions for the active tab */}
      <div className="mt-2 flex items-center justify-between border-t border-slate-800 pt-2">
        <div className="flex items-center gap-2">
          {activeTab === "profile" && profileError && (
            <span className="text-[11px] text-red-400">{profileError}</span>
          )}
          {activeTab === "profile" && profileSaved && !profileError && (
            <span className="text-[11px] text-emerald-400">Profile saved</span>
          )}
          {activeTab !== "profile" && (
            <span className="text-[10px] text-slate-500">
              Training and media changes are saved per action.
            </span>
          )}
        </div>
        {activeTab === "profile" && (
          <button
            type="button"
            onClick={handleSaveProfile}
            disabled={savingProfile}
            className="inline-flex items-center rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-slate-950 shadow-sm transition hover:bg-emerald-400 disabled:opacity-60"
          >
            {savingProfile ? "Saving..." : "Save"}
          </button>
        )}
      </div>
    </aside>
  );
}
