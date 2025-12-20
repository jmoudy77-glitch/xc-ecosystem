// app/programs/[programId]/(athletic)/training/page.tsx
// Program Training hub (server component)

import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type PageProps = {
  params: Promise<{
    programId: string;
  }>;
};

const MANAGER_ROLES = ["head_coach", "director", "admin"] as const;

type TrainingSessionPreview = {
  id: string;
  scheduled_date: string | null;
  completed_at: string | null;
  workout_category: string;
  title: string | null;
  athlete_id: string;
};

type TrainingExercisePreview = {
  id: string;
  program_id: string | null;
  label: string;
  workout_category: string;
  measurement_unit: string;
  is_active: boolean;
};

type PracticeNavContext = {
  teamId: string | null;
  teamSeasonId: string | null;
  href: string | null;
  reason: string | null;
};

type PersistedProgramContext = {
  teamId?: string | null;
  teamName?: string | null;
  seasonId?: string | null;
  seasonName?: string | null;
  seasonStatus?: string | null;
};

async function readPersistedProgramContext(programId: string): Promise<PersistedProgramContext> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(`xc_ctx_${programId}`)?.value;
    if (!raw) return {};
    const decoded = decodeURIComponent(raw);
    const parsed = JSON.parse(decoded);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as PersistedProgramContext;
  } catch {
    return {};
  }
}

export default async function ProgramTrainingPage({ params }: PageProps) {
  const { programId } = await params;

  const supabase = await supabaseServerComponent();

  //
  // 1) Auth
  //
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.warn("[ProgramTraining] auth.getUser error:", authError.message);
  }

  if (!authUser) {
    redirect("/login");
  }

  const authId = authUser.id;

  //
  // 2) Ensure viewer user row exists (same pattern as overview/staff/teams)
  //
  const { data: existingUserRow, error: userSelectError } = await supabaseAdmin
    .from("users")
    .select("id, auth_id, email")
    .eq("auth_id", authId)
    .maybeSingle();

  if (userSelectError) {
    console.error("[ProgramTraining] users select error:", userSelectError);
    throw new Error("Failed to load viewer user record");
  }

  let viewerUserRow = existingUserRow;

  if (!viewerUserRow) {
    const {
      data: insertedUser,
      error: userInsertError,
    } = await supabaseAdmin
      .from("users")
      .insert({
        auth_id: authId,
        email: authUser.email ?? null,
      })
      .select("id, auth_id, email")
      .single();

    if (userInsertError) {
      console.error(
        "[ProgramTraining] Failed to create viewer user row:",
        userInsertError,
      );
      throw new Error("Failed to create user record");
    }

    viewerUserRow = insertedUser;
  }

  const viewerUserId = viewerUserRow.id as string;

  //
  // 3) Membership & program basic info
  //
  const { data: membershipRow, error: membershipError } = await supabaseAdmin
    .from("program_members")
    .select(
      `
      id,
      role,
      program_id,
      programs!inner (
        id,
        name
      )
    `,
    )
    .eq("program_id", programId)
    .eq("user_id", viewerUserId)
    .maybeSingle();

  if (membershipError) {
    console.error("[ProgramTraining] membership error:", membershipError);
    throw new Error("Failed to load membership");
  }

  if (!membershipRow || !membershipRow.programs) {
    // Not a member of this program → bounce to dashboard
    redirect("/dashboard");
  }

  const programsRel = (membershipRow as any).programs;
  const programRecord = Array.isArray(programsRel)
    ? programsRel[0]
    : programsRel;

  const programName = (programRecord?.name as string) ?? "Program";

  const actingRole: string | null = (membershipRow.role as string) ?? null;
  const isManager =
    actingRole !== null &&
    MANAGER_ROLES.includes(actingRole.toLowerCase() as any);

  //
  // 3b) Resolve practice scheduler navigation context (team + current season)
  //
  let practiceNav: PracticeNavContext = {
    teamId: null,
    teamSeasonId: null,
    href: null,
    reason: null,
  };

  const persistedCtx = await readPersistedProgramContext(programId);

  try {
    // Prefer persisted context (team/season) chosen in the global Context Bar.
    // If not set, fallback to primary team.
    let teamId: string | null = (persistedCtx.teamId as string) ?? null;

    if (!teamId) {
      // Prefer primary team, fallback to first team.
      const { data: primaryTeam, error: primaryTeamError } = await supabaseAdmin
        .from("teams")
        .select("id, is_primary")
        .eq("program_id", programId)
        .order("is_primary", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (primaryTeamError) {
        throw primaryTeamError;
      }

      teamId = (primaryTeam?.id as string) ?? null;
    }

    if (!teamId) {
      practiceNav = {
        teamId: null,
        teamSeasonId: null,
        href: `/programs/${programId}/teams`,
        reason: "No team found yet — create a team to start planning practices.",
      };
    } else {
      // Prefer persisted season chosen in the global Context Bar.
      // If not set, fallback to current season (or most recent).
      let teamSeasonId: string | null = (persistedCtx.seasonId as string) ?? null;

      if (!teamSeasonId) {
        // Prefer current season, fallback to most recent active season.
        const { data: currentSeason, error: seasonError } = await supabaseAdmin
          .from("team_seasons")
          .select("id, is_current, is_active, created_at")
          .eq("program_id", programId)
          .eq("team_id", teamId)
          .order("is_current", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (seasonError) {
          throw seasonError;
        }

        teamSeasonId = (currentSeason?.id as string) ?? null;
      }

      if (!teamSeasonId) {
        practiceNav = {
          teamId,
          teamSeasonId: null,
          href: `/programs/${programId}/teams/${teamId}`,
          reason: "No team season found yet — create a season to start planning practices.",
        };
      } else {
        practiceNav = {
          teamId,
          teamSeasonId,
          href: `/programs/${programId}/teams/${teamId}/seasons/${teamSeasonId}/practice`,
          reason: null,
        };
      }
    }
  } catch (err: any) {
    console.error("[ProgramTraining] practice nav context error:", err);
    practiceNav = {
      teamId: null,
      teamSeasonId: null,
      href: `/programs/${programId}/teams`,
      reason: "Unable to resolve team/season for practice scheduler.",
    };
  }

  //
  // 4) Resolve base URL + cookie header once for internal API calls
  //
  let baseUrl: string | null = null;
  let cookieHeader: string = "";

  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "http";

    if (!host) {
      throw new Error("Missing host header");
    }

    baseUrl = `${proto}://${host}`;
    cookieHeader = (await cookies()).toString();
  } catch (err) {
    // baseUrl stays null; each fetch block will surface a friendly error
    console.error("[ProgramTraining] baseUrl/cookies init error:", err);
  }

  //
  // 4) Load training sessions preview via canonical API (no direct DB query)
  //
  let sessions: TrainingSessionPreview[] = [];
  let sessionsError: string | null = null;

  try {
    if (!baseUrl) {
      throw new Error("Missing base URL for internal API calls");
    }

    const res = await fetch(
      `${baseUrl}/api/programs/${programId}/training/sessions`,
      {
        cache: "no-store",
        headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${text}`);
    }

    const json = (await res.json()) as { sessions?: TrainingSessionPreview[] };
    sessions = (json.sessions ?? []) as TrainingSessionPreview[];
  } catch (err: any) {
    sessionsError = err?.message ?? "Failed to load sessions preview";
    console.error("[ProgramTraining] sessions preview error:", err);
  }

  //
  // 5) Load exercise library preview via canonical API
  //
  let exercises: TrainingExercisePreview[] = [];
  let exercisesError: string | null = null;

  try {
    if (!baseUrl) {
      throw new Error("Missing base URL for internal API calls");
    }

    const res = await fetch(
      `${baseUrl}/api/programs/${programId}/training/exercises?scope=all&active=true&limit=8`,
      {
        cache: "no-store",
        headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${text}`);
    }

    const json = (await res.json()) as { exercises?: TrainingExercisePreview[] };
    exercises = (json.exercises ?? []) as TrainingExercisePreview[];
  } catch (err: any) {
    exercisesError = err?.message ?? "Failed to load exercise library";
    console.error("[ProgramTraining] exercises preview error:", err);
  }

  return (
    <div className="bg-canvas">
      <div className="mx-auto w-full max-w-6xl space-y-4 px-4 py-4 sm:px-6">
      {/* Header / context card */}
      <section className="rounded-xl ring-1 ring-panel panel-muted p-5 text-[var(--foreground)]">
        <div className="flex items-start justify-between gap-4 border-l-2 border-subtle pl-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] text-[var(--muted-foreground)]">
              <Link href="/dashboard" className="hover:underline">
                Dashboard
              </Link>
              <span>›</span>
              <Link
                href={`/programs/${programId}`}
                className="hover:underline"
              >
                {programName}
              </Link>
              <span>›</span>
              <span>Training</span>
            </div>

            <h1 className="mt-1 text-sm font-semibold text-[var(--foreground)]">
              Training &amp; practice workspace
            </h1>
            <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
              Central hub for practice plans, workouts, and training templates
              for this program. This will eventually connect directly into the
              weather-aware practice scheduler and athlete training logs.
            </p>
          </div>

          <div className="hidden text-right text-[11px] text-[var(--muted-foreground)] sm:block">
            <p>
              Your role:{" "}
              <span className="font-mono text-[11px] text-[var(--foreground)]">
                {actingRole ?? "unknown"}
              </span>
            </p>
            <p className="mt-1">
              Manager privileges:{" "}
              <span className="font-mono text-[11px] text-[var(--foreground)]">
                {isManager ? "yes" : "no"}
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* Main training panels */}
      <section className="grid gap-4 md:grid-cols-3">
        {/* Practice planner */}
        <div className="md:col-span-2 space-y-4">
          <div className="rounded-xl ring-1 ring-panel panel p-5 text-[var(--foreground)]">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-[var(--foreground)]">
                  Practice planner
                </p>
                <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                  Plan daily practices by group, assign workouts, and tie them
                  to your season roster. Future: integrate weather snapshots and
                  WBGT-based heat policies directly into each practice.
                </p>
                {practiceNav.reason ? (
                  <p className="mt-2 text-[11px] text-[var(--muted-foreground)]">
                    {practiceNav.reason}
                  </p>
                ) : null}
              </div>
              <div className="hidden sm:flex sm:flex-col sm:items-end sm:gap-2">
                <span className="rounded-full ring-1 ring-panel bg-panel-muted px-2 py-0.5 text-[11px] text-[var(--muted-foreground)]">
                  Practice scheduler
                </span>
                {practiceNav.href ? (
                  <Link
                    href={practiceNav.href}
                    className="inline-flex items-center rounded-full ring-1 ring-panel bg-panel-muted px-3 py-1.5 text-[11px] font-medium text-[var(--foreground)] hover:bg-panel"
                  >
                    Open
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="mt-4 grid gap-3 text-[11px] text-[var(--muted-foreground)] sm:grid-cols-2">
              <div className="rounded-lg ring-1 ring-panel panel-muted p-3">
                <p className="text-[11px] font-semibold text-[var(--foreground)]">
                  Today&apos;s / upcoming practices
                </p>
                <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                  Future: list of upcoming practices with quick access to
                  groups, assigned workouts, and weather snapshots.
                </p>
              </div>
              <div className="rounded-lg ring-1 ring-panel panel-muted p-3">
                <p className="text-[11px] font-semibold text-[var(--foreground)]">
                  Group assignments
                </p>
                <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                  Future: drag-and-drop grouping by event group or training
                  focus, linked directly to your team season rosters.
                </p>
              </div>
            </div>
          </div>

          {/* Athlete training logs */}
          <div className="rounded-xl ring-1 ring-panel panel p-5 text-[var(--foreground)]">
            <p className="text-xs font-semibold text-[var(--foreground)]">
              Athlete training logs
            </p>
            <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
              This area will surface individual sessions from{" "}
              <code className="font-mono text-[10px]">
                athlete_training_sessions
              </code>{" "}
              as an at-a-glance view of what your athletes are actually doing
              (coach-assigned and self-assigned).
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[var(--muted-foreground)]">
              <span className="rounded-full ring-1 ring-panel bg-panel-muted px-2 py-0.5">
                Coach-assigned vs self-assigned
              </span>
              <span className="rounded-full ring-1 ring-panel bg-panel-muted px-2 py-0.5">
                RPE &amp; volume trends
              </span>
              <span className="rounded-full ring-1 ring-panel bg-panel-muted px-2 py-0.5">
                Availability &amp; injury flags
              </span>
              <span className="rounded-full ring-1 ring-panel bg-panel-muted px-2 py-0.5">
                Showing {sessions.length} recent sessions
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {sessionsError ? (
                <div className="rounded-lg ring-1 ring-panel panel-muted p-3 text-[11px] text-[var(--muted-foreground)]">
                  Failed to load sessions preview. {sessionsError}
                </div>
              ) : sessions.length === 0 ? (
                <div className="rounded-lg ring-1 ring-panel panel-muted p-3 text-[11px] text-[var(--muted-foreground)]">
                  No training sessions yet.
                </div>
              ) : (
                sessions.map((s) => {
                  const athleteLabel = s.athlete_id
                    ? `Athlete ${s.athlete_id.slice(0, 8)}`
                    : "Athlete";
                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-3 rounded-lg ring-1 ring-panel panel-muted p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-semibold text-[var(--foreground)]">
                          {s.title ?? athleteLabel}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
                          {s.workout_category}
                          {s.scheduled_date ? ` • ${s.scheduled_date}` : ""}
                          {s.completed_at ? " • completed" : ""}
                        </p>
                      </div>
                      <div className="shrink-0 text-[11px] text-[var(--muted-foreground)]">
                        <span className="rounded-full ring-1 ring-panel bg-panel-muted px-2 py-0.5">
                          {athleteLabel || "Athlete"}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right column: workouts/templates */}
        <aside className="space-y-4">
          <section className="rounded-xl ring-1 ring-panel panel p-5 text-[var(--foreground)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-[var(--foreground)]">
                  Exercise library
                </p>
                <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                  Foundational catalog (system + program) that workouts and practice plans are built from.
                </p>
              </div>
              <div className="shrink-0">
                <Link
                  href={`/programs/${programId}/training/exercises`}
                  className="inline-flex items-center rounded-full ring-1 ring-panel bg-panel-muted px-3 py-1.5 text-[11px] font-medium text-[var(--foreground)] hover:bg-panel"
                >
                  Manage
                </Link>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 rounded-lg ring-1 ring-panel panel-muted p-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-[var(--foreground)]">Workout library</p>
                <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
                  Build quantified workouts from your exercise catalog.
                </p>
              </div>
              <div className="shrink-0">
                <Link
                  href={`/programs/${programId}/training/workouts`}
                  className="inline-flex items-center rounded-full ring-1 ring-panel bg-panel-muted px-3 py-1.5 text-[11px] font-medium text-[var(--foreground)] hover:bg-panel"
                >
                  Manage
                </Link>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {exercisesError ? (
                <div className="rounded-lg ring-1 ring-panel panel-muted p-3 text-[11px] text-[var(--muted-foreground)]">
                  Failed to load exercises. {exercisesError}
                </div>
              ) : exercises.length === 0 ? (
                <div className="rounded-lg ring-1 ring-panel panel-muted p-3 text-[11px] text-[var(--muted-foreground)]">
                  No exercises yet. Add your first program exercise or seed your catalog.
                </div>
              ) : (
                exercises.map((ex) => {
                  const scopeLabel = ex.program_id ? "program" : "system";
                  return (
                    <div
                      key={ex.id}
                      className="flex items-center justify-between gap-3 rounded-lg ring-1 ring-panel panel-muted p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-semibold text-[var(--foreground)]">
                          {ex.label}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
                          {ex.workout_category} • {ex.measurement_unit}
                        </p>
                      </div>
                      <div className="shrink-0">
                        <span className="rounded-full ring-1 ring-panel bg-panel-muted px-2 py-0.5 text-[11px] text-[var(--muted-foreground)]">
                          {scopeLabel}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-3">
              <Link
                href={`/programs/${programId}/training/exercises`}
                className="inline-flex items-center rounded-full ring-1 ring-panel bg-panel-muted px-3 py-1.5 text-[11px] font-medium text-[var(--foreground)] hover:bg-panel"
              >
                Open exercise library
              </Link>
            </div>
          </section>

          <section className="rounded-xl ring-1 ring-panel panel p-5 text-[var(--foreground)]">
            <p className="text-xs font-semibold text-[var(--foreground)]">
              Workouts &amp; templates
            </p>
            <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
              Library of reusable workouts and training event templates for this
              program. In the roadmap, these tie directly into your practice
              planner and athlete sessions.
            </p>
            <ul className="mt-2 space-y-1 text-[11px] text-[var(--muted-foreground)]">
              <li>• System and program-specific workouts</li>
              <li>• Event-specific training blocks</li>
              <li>• Copy / adapt for new seasons</li>
            </ul>
            <div className="mt-3">
              <Link
                href="#"
                className="inline-flex items-center rounded-full ring-1 ring-panel bg-panel-muted px-3 py-1.5 text-[11px] font-medium text-[var(--foreground)] hover:bg-panel"
              >
                Open workouts library
              </Link>
            </div>
          </section>

          <section className="rounded-xl ring-1 ring-panel panel p-5 text-[var(--foreground)]">
            <p className="text-xs font-semibold text-[var(--foreground)]">
              Weather &amp; heat policies (roadmap)
            </p>
            <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
              Future: snapshot WBGT readings, heat policy recommendations, and
              practice adjustments for each session, using{" "}
              <code className="font-mono text-[10px]">
                practice_weather_snapshots
              </code>{" "}
              and{" "}
              <code className="font-mono text-[10px]">
                heat_policies
              </code>
              .
            </p>
          </section>
        </aside>
      </section>
      </div>
    </div>
  );
}