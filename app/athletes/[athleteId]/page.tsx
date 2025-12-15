// app/athletes/[athleteId]/page.tsx
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
// ⬇️ Adjust this import path to match your project’s Supabase helper
import { supabaseServer } from "@/lib/supabaseServer";
import { AthleteMediaSection } from "./AthleteMediaSection";
import { AthleteEditPanel } from "./AthleteEditPanel";

type PageProps = {
  params: Promise<{
    athleteId: string;
  }>;
  searchParams?: Promise<{
    week?: string;
  }>;
};

type Athlete = {
  id: string;
  first_name: string;
  last_name: string;
  grad_year: number;
  event_group: string;
  hs_school_name: string | null;
  hs_city: string | null;
  hs_state: string | null;
  avatar_url: string | null;
  gender: string | null;
  user_id: string | null;
  is_claimed: boolean;
  bio: string | null;
  gpa: number | null;
  test_scores: any | null;
};

type AthleteScore = {
  academic_score: number;
  performance_score: number;
  availability_score: number;
  conduct_score: number;
  coachable_score: number;
  global_overall: number;
};

type AthleteMedia = {
  id: string;
  media_type: "photo" | "video";
  role: "highlight_reel" | "action_shot" | "gallery";
  url: string;
  sort_order: number;
};

type AthletePerformance = {
  id: string;
  event_code: string;
  mark_seconds: number | null;
  performance_date: string | null;
  meet_name: string | null;
  performance_type: "verified_meet" | "self_reported" | "training";
  is_personal_best: boolean;
};

type AthleteTrainingSession = {
  id: string;
  athlete_id: string;
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

export default async function AthletePage({ params, searchParams }: PageProps) {
  const [resolvedParams, resolvedSearch] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({} as { week?: string }),
  ]);

  const { athleteId } = resolvedParams;
  const weekParam = resolvedSearch.week ?? "0";
  let weekOffset = parseInt(weekParam, 10);
  if (Number.isNaN(weekOffset) || weekOffset < 0) {
    weekOffset = 0;
  }

  const cookieStore = await cookies();
  const { supabase } = supabaseServer(cookieStore);

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  // Map the logged-in Supabase Auth user to our app-level `public.users` row.
  // NOTE: `athletes.user_id` references `public.users.id` (NOT `auth.users.id`).
  const { data: appUser, error: appUserError } = authUser?.id
    ? await supabase
        .from("users")
        .select("id, auth_id")
        .eq("auth_id", authUser.id)
        .maybeSingle<{ id: string; auth_id: string }>()
    : { data: null, error: null };

  if (appUserError) {
    console.error("[AthletePage] appUserError", appUserError);
  }

  const [
    { data: athlete, error: athleteError },
    { data: score, error: scoreError },
    { data: media, error: mediaError },
    { data: performances, error: perfError },
  ] = await Promise.all([
    supabase
      .from("athletes")
      .select(
        "id, first_name, last_name, grad_year, event_group, hs_school_name, hs_city, hs_state, avatar_url, gender, user_id, is_claimed, bio, gpa, test_scores"
      )
      .eq("id", athleteId)
      .maybeSingle<Athlete>(),
    supabase
      .from("athlete_scores")
      .select(
        "academic_score, performance_score, availability_score, conduct_score, coachable_score, global_overall"
      )
      .eq("athlete_id", athleteId)
      .maybeSingle<AthleteScore>(),
    supabase
      .from("athlete_media")
      .select("id, media_type, role, url, sort_order")
      .eq("athlete_id", athleteId)
      .order("sort_order", { ascending: true }) as any,
    supabase
      .from("athlete_performances")
      .select(
        "id, event_code, mark_seconds, performance_date, meet_name, performance_type, is_personal_best"
      )
      .eq("athlete_id", athleteId) as any,
  ]);

  // Load training sessions for Training Diary in a 7-day window,
  // using weekOffset (0 = current week, 1 = previous week, etc.)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() - weekOffset * 7);
  const weekStart = new Date(weekEnd);
  weekStart.setDate(weekEnd.getDate() - 6);

  const weekStartISO = weekStart.toISOString().slice(0, 10);
  const weekEndISO = weekEnd.toISOString().slice(0, 10);

  const { data: trainingSessionsRaw, error: trainingError } = await supabase
    .from("athlete_training_sessions")
    .select("*")
    .eq("athlete_id", athleteId)
    .gte("scheduled_date", weekStartISO)
    .lte("scheduled_date", weekEndISO)
    .order("scheduled_date", { ascending: false })
    .order("completed_at", { ascending: false });

  if (trainingError) {
    console.error("[AthletePage] trainingError", trainingError);
  }

  const trainingSessions: AthleteTrainingSession[] =
    (trainingSessionsRaw as AthleteTrainingSession[] | null) ?? [];

  // Group sessions by date (prefer scheduled_date, fallback to completed_at date)
  const trainingDiaryByDate = trainingSessions.reduce(
    (acc: Record<string, AthleteTrainingSession[]>, session) => {
      const dateKey =
        session.scheduled_date ??
        (session.completed_at ? session.completed_at.slice(0, 10) : null);

      if (!dateKey) return acc;
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(session);
      return acc;
    },
    {}
  );

  const trainingDiaryDates = Object.keys(trainingDiaryByDate).sort((a, b) =>
    b.localeCompare(a)
  );

  const formatRangeDate = (d: Date, includeYear: boolean) =>
    d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: includeYear ? "numeric" : undefined,
    });

  const includeYear = weekStart.getFullYear() !== weekEnd.getFullYear();
  const weekRangeLabel = `${formatRangeDate(
    weekStart,
    includeYear
  )} – ${formatRangeDate(weekEnd, includeYear)}`;

  if (athleteError) {
    console.error("[AthletePage] athleteError", athleteError);
  }
  if (!athlete) {
    notFound();
  }

  const isSelfView = !!authUser && !!appUser && !!athlete.user_id && athlete.user_id === appUser.id;

  const needsClaimCompletion = isSelfView && !athlete.is_claimed;

  const canEditMedia = isSelfView;

  const scores: AthleteScore | null = score ?? null;
  const mediaItems: AthleteMedia[] = (media ?? []) as AthleteMedia[];
  const performanceItems: AthletePerformance[] = (performances ?? []) as AthletePerformance[];

  const highlight = mediaItems.find(
    (m) => m.role === "highlight_reel" && m.media_type === "video"
  );
  const actionShots = mediaItems
    .filter((m) => m.role === "action_shot" && m.media_type === "photo")
    .slice(0, 3);

  const verifiedPBs = performanceItems.filter(
    (p) =>
      p.performance_type === "verified_meet" &&
      p.is_personal_best &&
      p.mark_seconds !== null
  );

  // If you guarantee 1 PB per event_code this is already unique enough.
  const topPerformances = verifiedPBs
    .sort((a, b) => (a.mark_seconds! - b.mark_seconds!))
    .slice(0, 3);

  const selfReportedPerformances = performanceItems.filter((p) =>
    ["self_reported", "training"].includes(p.performance_type)
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <main
        className={
          canEditMedia
            ? "mx-auto grid max-w-6xl gap-8 px-4 pb-12 pt-8 md:grid-cols-[minmax(0,2.2fr)_minmax(260px,0.9fr)] md:px-8"
            : "mx-auto flex max-w-6xl flex-col gap-8 px-4 pb-12 pt-8 md:px-8"
        }
      >
        {/* Left column: main profile content */}
        <div className="flex flex-col gap-8">
          {/* Hero + Media strip */}
          <section className="rounded-3xl bg-slate-900/70 p-6 shadow-xl ring-1 ring-slate-800 backdrop-blur-sm transition-colors duration-200 md:p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              {/* Left: avatar + name */}
              <div className="flex items-center gap-4">
                <div className="relative h-28 w-24 overflow-hidden rounded-2xl bg-slate-800 md:h-32 md:w-28">
                  {athlete.avatar_url ? (
                    <Image
                      src={athlete.avatar_url}
                      alt={`${athlete.first_name} ${athlete.last_name}`}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                      No Photo
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <h1 className="text-2xl font-semibold md:text-3xl">
                    {athlete.first_name} {athlete.last_name}
                  </h1>
                  <p className="text-sm text-slate-300">
                    {athlete.grad_year} Grad
                    {athlete.event_group ? (
                      <>
                        {" "}
                        · <span className="uppercase">{athlete.event_group}</span>
                      </>
                    ) : null}
                  </p>
                  <p className="text-xs text-slate-400">
                    {athlete.hs_school_name && `${athlete.hs_school_name} · `}
                    {athlete.hs_city}
                    {athlete.hs_city && athlete.hs_state ? ", " : ""}
                    {athlete.hs_state}
                  </p>
                </div>
              </div>

              {/* Right: featured media strip */}
              <AthleteMediaSection
                athleteId={athlete.id}
                highlight={highlight ?? null}
                actionShots={actionShots}
                canEdit={canEditMedia}
              />
            </div>
          </section>

          {/* Top performances + global scores */}
          <section className="grid gap-6 md:grid-cols-[2fr,1.4fr]">
            {/* Left: top performances */}
            <div className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                Top Performances (Verified)
              </h2>
              <div className="grid gap-3 md:grid-cols-3">
                {topPerformances.length > 0 ? (
                  topPerformances.map((perf) => (
                    <div
                      key={perf.id}
                      className="flex flex-col justify-between rounded-2xl bg-slate-900/70 px-4 py-3 shadow ring-1 ring-slate-800 transition-transform transition-shadow duration-200 hover:-translate-y-0.5 hover:shadow-xl"
                    >
                      <div className="text-xs uppercase tracking-wide text-slate-400">
                        {perf.event_code}
                      </div>
                      <div className="mt-1 text-xl font-semibold">
                        {formatTime(perf.mark_seconds)}
                      </div>
                      <div className="mt-1 text-[10px] font-medium uppercase tracking-wide text-emerald-400">
                        Verified
                      </div>
                      {perf.performance_date && (
                        <div className="mt-1 text-[10px] text-slate-500">
                          {perf.performance_date}
                          {perf.meet_name ? ` · ${perf.meet_name}` : ""}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="col-span-full rounded-2xl bg-slate-900/70 px-4 py-6 text-sm text-slate-400 ring-1 ring-slate-800 backdrop-blur-sm">
                    No verified performances yet.
                  </div>
                )}
              </div>
            </div>

            {/* Right: scores overview */}
            <div className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                Global Scores
              </h2>
              {scores ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <ScoreCard label="Overall" value={scores.global_overall} accent="bg-sky-500" />
                  <ScoreCard
                    label="Performance"
                    value={scores.performance_score}
                    accent="bg-emerald-500"
                  />
                  <ScoreCard
                    label="Academic"
                    value={scores.academic_score}
                    accent="bg-indigo-500"
                  />
                  <ScoreCard
                    label="Availability"
                    value={scores.availability_score}
                    accent="bg-amber-500"
                  />
                  <ScoreCard
                    label="Conduct"
                    value={scores.conduct_score}
                    accent="bg-fuchsia-500"
                  />
                  <ScoreCard
                    label="Coachability"
                    value={scores.coachable_score}
                    accent="bg-teal-500"
                  />
                </div>
              ) : (
                <div className="rounded-2xl bg-slate-900/70 px-4 py-6 text-sm text-slate-400 ring-1 ring-slate-800 backdrop-blur-sm">
                  No scores available yet.
                </div>
              )}
            </div>
          </section>

          {/* Academics + self-reported training + bio */}
          <section className="grid gap-6 md:grid-cols-[1.4fr,2fr]">
            {/* Academics + bio */}
            <div className="space-y-4">
              <div className="rounded-2xl bg-slate-900/70 p-4 ring-1 ring-slate-800 backdrop-blur-sm transition-colors duration-200 hover:bg-slate-900">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                  Academics
                </h3>
                <p className="mt-2 text-sm text-slate-400">
                  GPA:{" "}
                  <span className="text-slate-300">
                    {athlete.gpa != null ? athlete.gpa.toFixed(2) : "—"}
                  </span>{" "}
                  <span className="text-xs text-slate-500">(self-reported)</span>
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Test Scores:{" "}
                  <span className="text-slate-300">
                    {athlete.test_scores?.sat
                      ? `SAT ${athlete.test_scores.sat}`
                      : athlete.test_scores?.act
                      ? `ACT ${athlete.test_scores.act}`
                      : "—"}
                  </span>
                </p>
                <p className="mt-3 text-xs text-slate-500">
                  Academic details are self-reported by the athlete.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-900/70 p-4 ring-1 ring-slate-800 backdrop-blur-sm transition-colors duration-200 hover:bg-slate-900">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                  Bio & Story
                </h3>
                <p className="mt-2 text-sm text-slate-400 whitespace-pre-line">
                  {athlete.bio && athlete.bio.trim().length > 0
                    ? athlete.bio
                    : "This is where the athlete can share a short story about their journey, goals, and what they’re looking for in a college program."}
                </p>
              </div>
            </div>

            {/* Self-reported / training performances */}
            <div className="rounded-2xl bg-slate-900/70 p-4 ring-1 ring-slate-800 backdrop-blur-sm transition-colors duration-200 hover:bg-slate-900">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                Training & Self-Reported Marks
              </h3>
              {selfReportedPerformances.length > 0 ? (
                <div className="mt-3 space-y-2 text-sm">
                  {selfReportedPerformances.map((perf) => (
                    <div
                      key={perf.id}
                      className="flex items-baseline justify-between rounded-xl bg-slate-900 px-3 py-2 text-slate-200"
                    >
                      <div>
                        <div className="text-xs uppercase tracking-wide text-slate-400">
                          {perf.event_code} ·{" "}
                          {perf.performance_type === "training" ? "Training" : "Self-reported"}
                        </div>
                        {perf.performance_date && (
                          <div className="text-[10px] text-slate-500">
                            {perf.performance_date}
                            {perf.meet_name ? ` · ${perf.meet_name}` : ""}
                          </div>
                        )}
                      </div>
                      <div className="ml-4 text-sm font-semibold">
                        {formatTime(perf.mark_seconds)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-400">
                  No training or self-reported marks yet.
                </p>
              )}
            </div>
          </section>

          {/* Training diary (7-day window with navigation) */}
          <section>
            <div className="rounded-2xl bg-slate-900/70 p-4 ring-1 ring-slate-800 backdrop-blur-sm transition-colors duration-200 hover:bg-slate-900/80">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                    Training Diary{" "}
                    <span className="text-[11px] font-normal text-slate-400">
                      ({weekRangeLabel})
                    </span>
                  </h3>
                  <span className="text-xs text-slate-500">
                    Coach-assigned &amp; self-logged
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {/* Backward: older weeks */}
                  <Link
                    href={`?week=${weekOffset + 1}`}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 text-xs text-slate-300 hover:bg-slate-800"
                  >
                    ←
                  </Link>
                  {/* Forward: newer weeks (disabled at current week) */}
                  {weekOffset > 0 ? (
                    <Link
                      href={`?week=${weekOffset - 1}`}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 text-xs text-slate-300 hover:bg-slate-800"
                    >
                      →
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-800 text-xs text-slate-500 opacity-50"
                    >
                      →
                    </button>
                  )}
                </div>
              </div>

              {trainingDiaryDates.length === 0 ? (
                <p className="mt-3 text-sm text-slate-400">
                  No training sessions logged for this week. Sessions you or your coach log
                  will show here.
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  {trainingDiaryDates.map((date) => {
                    const sessionsForDate = trainingDiaryByDate[date] ?? [];
                    return (
                      <div
                        key={date}
                        className="rounded-2xl bg-slate-950/60 px-3 py-2 ring-1 ring-slate-800"
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <div className="text-[11px] font-medium text-slate-200">
                            {date}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {sessionsForDate.length} session
                            {sessionsForDate.length !== 1 ? "s" : ""}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          {sessionsForDate.map((session) => {
                            const isCoach = session.source === "coach_assigned";
                            const isCompleted = !!session.completed_at;
                            return (
                              <div
                                key={session.id}
                                className="flex items-start justify-between gap-2 rounded-xl bg-slate-900/80 px-3 py-1.5 text-[11px] text-slate-100"
                              >
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
                                  {(session.actual_distance_m ||
                                    session.actual_duration_sec ||
                                    session.actual_rpe) && (
                                    <div className="mt-0.5 text-[10px] text-slate-400">
                                      {session.actual_distance_m
                                        ? `${(session.actual_distance_m / 1609.34).toFixed(
                                            1
                                          )} mi`
                                        : null}
                                      {session.actual_distance_m &&
                                      session.actual_duration_sec
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
                                  {!session.actual_distance_m &&
                                    !session.actual_duration_sec &&
                                    !session.actual_rpe &&
                                    !session.actual_description &&
                                    (session.planned_distance_m ||
                                      session.planned_duration_sec ||
                                      session.planned_rpe) && (
                                      <div className="mt-0.5 text-[10px] text-slate-500">
                                        Planned:{" "}
                                        {session.planned_distance_m
                                          ? `${(
                                              session.planned_distance_m / 1609.34
                                            ).toFixed(1)} mi`
                                          : null}
                                        {session.planned_distance_m &&
                                        session.planned_duration_sec
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
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* More media gallery placeholder */}
          <section>
            <div className="rounded-2xl bg-slate-900/70 p-4 ring-1 ring-slate-800 backdrop-blur-sm transition-colors duration-200 hover:bg-slate-900/80">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                  More Media
                </h3>
                <span className="text-xs text-slate-500">Gallery coming soon</span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div className="flex h-24 items-center justify-center rounded-2xl bg-slate-900 text-xs text-slate-500">
                  Additional media will appear here.
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right column: fixed tools panel (only for athlete self-view, md+ screens) */}
        {canEditMedia && (
          <div className="hidden md:flex flex-col">
            <AthleteEditPanel
              athleteId={athlete.id}
              initialBio={athlete.bio ?? ""}
              initialGpa={athlete.gpa}
              initialTestScores={athlete.test_scores}
            />
          </div>
        )}
      </main>
    </div>
  );
}

/**
 * Utility: format seconds into m:ss or h:mm:ss
 */
function formatTime(seconds: number | null): string {
  if (seconds == null || Number.isNaN(seconds)) return "—";
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(secs)}`;
  }
  return `${minutes}:${pad(secs)}`;
}

type ScoreCardProps = {
  label: string;
  value: number;
  accent: string; // Tailwind bg-* class
};

function ScoreCard({ label, value, accent }: ScoreCardProps) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-slate-900/70 px-4 py-3 shadow ring-1 ring-slate-800 transition-transform transition-shadow duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:bg-slate-900">
      <div>
        <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
        <div className="mt-1 text-xs text-slate-500">Score</div>
      </div>
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold text-slate-950 ${accent}`}
      >
        {value ?? "—"}
      </div>
    </div>
  );
}