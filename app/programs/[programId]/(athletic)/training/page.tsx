// app/programs/[programId]/(athletic)/training/page.tsx
// Program Training hub (server component)

import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { unstable_cache } from "next/cache";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { classifyHeatRiskFromPolicy } from "@/lib/heatPolicies";
import { getWeeklyWeatherFromTomorrowIo } from "@/lib/weather/tomorrow";
import type { HeatRiskLevel, WeeklyWeatherDay as TomorrowWeeklyWeatherDay } from "@/lib/weather/tomorrow";
import TrainingWorkspaceClient from "./TrainingWorkspaceClient";

type PageProps = {
  params: Promise<{
    programId: string;
  }>;
  searchParams?: Promise<{
    week?: string;
    date?: string;
    scope?: string;
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

type CalendarEvent = {
  id: string;
  type: "training";
  date: string; // YYYY-MM-DD
  startTime: string | null; // ISO
  endTime: string | null; // ISO
  title: string;
  location: string | null;
  status: "planned" | "published" | "completed" | "canceled";
  teamId: string | null;
  teamLabel: string | null;
  ownerProgramMemberId: string | null;
  isSelectable: boolean; // strict ownership
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

type WeeklyWeatherDay = {
  dateIso: string;
  wbgtF: number | null;
  wbgtC: number | null;
  tempF: number | null;
  humidityPercent: number | null;
  windMph: number | null;
  summary: string | null;
  heatRisk: any | null;
};

type PrefetchPracticeWeatherResult = {
  plans: any[];
  weatherByDate: Record<string, WeeklyWeatherDay>;
  heatPolicy: any | null;
};

// Cache practice + weather data for the current week + next week (14 days) to reduce external weather calls.
// Even when the underlying data is already snapshotted in DB, caching avoids repeated heavy queries and any
// downstream weather-service fetches the planner surface may trigger when data is missing.
const getPrefetchedPracticeWeather = unstable_cache(
  async (args: {
    programId: string;
    teamSeasonId: string;
    scope: "team" | "program";
    rangeFrom: string; // YYYY-MM-DD
    rangeTo: string; // YYYY-MM-DD
  }): Promise<PrefetchPracticeWeatherResult> => {
    const { programId, teamSeasonId, scope, rangeFrom, rangeTo } = args;

    // Practice plans
    let q = supabaseAdmin
      .from("practice_plans")
      .select(
        "id, program_id, team_season_id, practice_date, start_time, end_time, location, label, status, weather_snapshot, wbgt_f, wbgt_c, heat_risk, created_at",
      )
      .eq("program_id", programId)
      .gte("practice_date", rangeFrom)
      .lte("practice_date", rangeTo)
      .order("practice_date", { ascending: true });

    if (scope === "team") {
      q = q.eq("team_season_id", teamSeasonId);
    }

    const { data: plans, error: plansError } = await q;
    if (plansError) throw plansError;

    const practicePlans = (plans ?? []) as any[];

    // Heat policy (from team season)
    let heatPolicy: any | null = null;
    const { data: seasonRow, error: seasonErr } = await supabaseAdmin
      .from("team_seasons")
      .select("heat_policy_id")
      .eq("id", teamSeasonId)
      .maybeSingle();

    if (seasonErr) throw seasonErr;

    const heatPolicyId = (seasonRow?.heat_policy_id as string) ?? null;
    if (heatPolicyId) {
      const { data: policy, error: policyErr } = await supabaseAdmin
        .from("heat_policies")
        .select("*")
        .eq("id", heatPolicyId)
        .maybeSingle();

      if (policyErr) throw policyErr;
      heatPolicy = policy ?? null;
    }

    // Latest snapshot per day across plans in range.
    const planIds = practicePlans.map((p) => p.id).filter(Boolean);

    const weatherByDate: Record<string, WeeklyWeatherDay> = {};
    if (planIds.length > 0) {
      const { data: snaps, error: snapsErr } = await supabaseAdmin
        .from("practice_weather_snapshots")
        .select(
          "practice_plan_id, captured_at, wbgt_f, wbgt_c, temp_f, humidity_percent, wind_mph, weather_summary, heat_risk, practice_plans!inner(practice_date)",
        )
        .in("practice_plan_id", planIds)
        .order("captured_at", { ascending: false });

      if (snapsErr) throw snapsErr;

      for (const s of snaps ?? []) {
        const dateIso = (s as any)?.practice_plans?.practice_date?.slice(0, 10);
        if (!dateIso) continue;
        if (weatherByDate[dateIso]) continue; // first is latest due to captured_at desc

        weatherByDate[dateIso] = {
          dateIso,
          wbgtF: (s as any)?.wbgt_f ?? null,
          wbgtC: (s as any)?.wbgt_c ?? null,
          tempF: (s as any)?.temp_f ?? null,
          humidityPercent: (s as any)?.humidity_percent ?? null,
          windMph: (s as any)?.wind_mph ?? null,
          summary: (s as any)?.weather_summary ?? null,
          heatRisk: (s as any)?.heat_risk ?? null,
        };
      }
    }

    return { plans: practicePlans, weatherByDate, heatPolicy };
  },
  // keyParts: stable cache key namespace
  ["training_prefetch_practice_weather_v1"],
  {
    // 30 minutes is a good starting point; snapshotted weather can change, but we want to avoid bursty calls.
    revalidate: 60 * 30,
  },
);


function deriveHeatRiskFromForecast(policy: any | null, wetBulbF: number | null): HeatRiskLevel | null {
  if (!policy) return null;
  if (wetBulbF == null) return null;

  try {
    return (classifyHeatRiskFromPolicy(policy as any, wetBulbF) as HeatRiskLevel | null) ?? null;
  } catch {
    return null;
  }
}

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map((x) => Number(x));
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

// Program-level forecast cache (independent of practice plans).
// Uses school lat/lon as the default location anchor.
// Returns a 14-day map (this week + next week) in the exact TomorrowWeeklyWeatherDay shape
// expected by PracticePlannerWeeklySurface.
const getCachedProgramForecast = unstable_cache(
  async (args: {
    programId: string;
    startDateIso: string; // YYYY-MM-DD (week start)
    lat: number;
    lon: number;
  }): Promise<Record<string, TomorrowWeeklyWeatherDay>> => {
    const { startDateIso, lat, lon } = args;

    const week1 = await getWeeklyWeatherFromTomorrowIo({
      lat,
      lon,
      startDateIso,
    });

    const week2StartIso = addDaysIso(startDateIso, 7);
    const week2 = await getWeeklyWeatherFromTomorrowIo({
      lat,
      lon,
      startDateIso: week2StartIso,
    });

    const map: Record<string, TomorrowWeeklyWeatherDay> = {};
    for (const day of [...(week1 ?? []), ...(week2 ?? [])]) {
      if (!day?.dateIso) continue;
      map[day.dateIso] = day as TomorrowWeeklyWeatherDay;
    }

    return map;
  },
  ["training_program_forecast_v2"],
  {
    // Forecast is OK to be a bit stale; we prefer fewer calls.
    revalidate: 60 * 45,
  },
);

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

export default async function ProgramTrainingPage({ params, searchParams }: PageProps) {
  const { programId } = await params;
  const sp = (await searchParams) ?? {};

  const requestedWeek = typeof sp.week === "string" ? sp.week : null;
  const requestedDate = typeof sp.date === "string" ? sp.date : null;
  const requestedScopeRaw = typeof sp.scope === "string" ? sp.scope : null;
  const requestedScope: "team" | "program" = requestedScopeRaw === "program" ? "program" : "team";

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

  // Default location anchor for program-level forecast (school lat/lon)
  let programLat: number | null = null;
  let programLon: number | null = null;

  try {
    const { data: progRow, error: progErr } = await supabaseAdmin
      .from("programs")
      .select("school_id")
      .eq("id", programId)
      .maybeSingle();

    if (progErr) throw progErr;

    const schoolId = (progRow?.school_id as string) ?? null;
    if (schoolId) {
      const { data: schoolRow, error: schoolErr } = await supabaseAdmin
        .from("schools")
        .select("latitude, longitude")
        .eq("id", schoolId)
        .maybeSingle();

      if (schoolErr) throw schoolErr;

      const lat = (schoolRow?.latitude as number) ?? null;
      const lon = (schoolRow?.longitude as number) ?? null;
      if (typeof lat === "number" && typeof lon === "number") {
        programLat = lat;
        programLon = lon;
      }
    }
  } catch (err: any) {
    console.warn("[ProgramTraining] unable to load school lat/lon for forecast:", err?.message ?? err);
  }

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

  function dateOnly(d: Date) {
    return d.toISOString().slice(0, 10);
  }

  function parseISODateUTC(iso: string) {
    // iso: YYYY-MM-DD
    const [y, m, d] = iso.split("-").map((x) => Number(x));
    if (!y || !m || !d) return null;
    return new Date(Date.UTC(y, m - 1, d));
  }

  function startOfWeekSunday(d: Date) {
    const copy = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const day = copy.getUTCDay(); // 0=Sun
    copy.setUTCDate(copy.getUTCDate() - day); // move back to Sunday
    return copy;
  }

  function addDays(d: Date, days: number) {
    const copy = new Date(d.getTime());
    copy.setUTCDate(copy.getUTCDate() + days);
    return copy;
  }

  function toLocalNoon(dUtc: Date) {
    return new Date(
      dUtc.getUTCFullYear(),
      dUtc.getUTCMonth(),
      dUtc.getUTCDate(),
      12,
      0,
      0,
    );
  }


  //
  // 4b) Load program-wide training calendar events (practice plans) for the current week
  //
  const now = new Date();
  const today = dateOnly(now);

  // Training week navigation expects `week` to be the week-start key (Sunday, YYYY-MM-DD) to match the calendar UI (Sun–Sat).
  // Parse it as UTC to avoid server/runtime timezone shifts.
  const requestedWeekUTC = requestedWeek ? parseISODateUTC(requestedWeek) : null;

  const weekStartUtc = requestedWeekUTC ? requestedWeekUTC : startOfWeekSunday(now);
  const weekEndUtc = addDays(weekStartUtc, 6);
  const weekFrom = dateOnly(weekStartUtc);
  const weekTo = dateOnly(weekEndUtc);

  // Local-noon dates for UI components that use local date math (prevents timezone drift).
  const weekStartUi = toLocalNoon(weekStartUtc);
  const weekEndUi = toLocalNoon(weekEndUtc);
  const prevWeekUi = toLocalNoon(addDays(weekStartUtc, -7));
  const nextWeekUi = toLocalNoon(addDays(weekStartUtc, 7));

  // Selected day for the daily agenda (must be inside this week to apply).
  const selectedDateKey =
    requestedDate && requestedDate >= weekFrom && requestedDate <= weekTo
      ? requestedDate
      : null;

  let calendarEvents: CalendarEvent[] = [];
  let calendarError: string | null = null;

  try {
    if (!baseUrl) throw new Error("Missing base URL for internal API calls");

    const res = await fetch(
      `${baseUrl}/api/programs/${programId}/training/calendar?from=${weekFrom}&to=${weekTo}`,
      {
        cache: "no-store",
        headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${text}`);
    }

    const json = (await res.json()) as { events?: CalendarEvent[] };
    calendarEvents = (json.events ?? []) as CalendarEvent[];
  } catch (err: any) {
    calendarError = err?.message ?? "Failed to load calendar";
    console.error("[ProgramTraining] calendar error:", err);
  }

  //
  // 4c) Load practice plans + aligned weekly weather strip data for the Practice Planner weekly surface
  //      Prefetch/cached for this week + next week (14 days) to reduce repeated calls.
  //
  let weeklyPracticePlans: any[] = [];
  let weeklyWeather: any[] = [];
  let heatPolicy: any = null;

  try {
    if (practiceNav.teamId && practiceNav.teamSeasonId) {
      const rangeFrom = weekFrom;
      const rangeTo = dateOnly(addDays(weekStartUtc, 13)); // current week + next week

      const prefetched = await getPrefetchedPracticeWeather({
        programId,
        teamSeasonId: practiceNav.teamSeasonId,
        scope: requestedScope,
        rangeFrom,
        rangeTo,
      });
      heatPolicy = prefetched.heatPolicy ?? null;

      // Slice to the currently displayed week for the embedded weekly surface.
      weeklyPracticePlans = (prefetched.plans ?? []).filter((p: any) => {
        const d = (p?.practice_date as string) ?? "";
        return d >= weekFrom && d <= weekTo;
      });

      // Build a full 7-day weather strip independent of practice plans.
      // Start with cached program forecast, then overlay latest per-practice snapshot values if present.
      let forecastMap: Record<string, TomorrowWeeklyWeatherDay> = {};

      if (programLat !== null && programLon !== null) {
        forecastMap = await getCachedProgramForecast({
          programId,
          startDateIso: rangeFrom,
          lat: programLat,
          lon: programLon,
        });
      }

      const weatherArr: TomorrowWeeklyWeatherDay[] = [];
      for (let i = 0; i < 7; i++) {
        const dateIso = dateOnly(addDays(weekStartUtc, i));

        const base = forecastMap?.[dateIso] ?? null;
        const snap = (prefetched.weatherByDate ?? {})[dateIso] ?? null;

        // Practice snapshot values override forecast when present.
        const wetBulbF = snap?.wbgtF ?? base?.wetBulbF ?? null;
        const wetBulbC = snap?.wbgtC ?? base?.wetBulbC ?? null;

        const tempMinF = snap?.tempF ?? base?.tempMinF ?? null;
        const tempMaxF = snap?.tempF ?? base?.tempMaxF ?? null;

        const windMph = snap?.windMph ?? base?.windMph ?? null;
        const windKph = base?.windKph ?? (windMph != null ? windMph / 0.621371 : null);

        const summary = snap?.summary ?? base?.summary ?? null;
        const weatherCode = base?.weatherCode ?? null;

        const derivedHeatRisk =
          (snap?.heatRisk as HeatRiskLevel | null) ??
          deriveHeatRiskFromForecast(heatPolicy, wetBulbF) ??
          (base?.heatRisk as HeatRiskLevel | null) ??
          "low";

        weatherArr.push({
          dateIso,
          tempMaxC: base?.tempMaxC ?? null,
          tempMinC: base?.tempMinC ?? null,
          wetBulbC,
          tempMaxF,
          tempMinF,
          wetBulbF,
          windKph,
          windMph,
          weatherCode,
          summary,
          heatRisk: derivedHeatRisk,
        } satisfies TomorrowWeeklyWeatherDay);
      }

      weeklyWeather = weatherArr;
    }
  } catch (err: any) {
    console.error("[ProgramTraining] weekly practice/weather prefetch error:", err);
    // Non-fatal: the training page should still render.
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
    <div className="bg-transparent">
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

      {/* Main training workspace */}
      <section className="rounded-xl ring-1 ring-panel panel p-5 text-[var(--foreground)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-[var(--foreground)]">
              Training calendar
            </p>
            <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
              Program-wide view of training events (shared facilities awareness). Only practices you created are selectable in this view.
            </p>
          </div>
          {/*<span className="rounded-full ring-1 ring-panel bg-panel-muted px-2 py-0.5 text-[11px] text-[var(--muted-foreground)]">
            Week {weekFrom}–{weekTo}
          </span>*/}
        </div>

        {calendarError ? (
          <div className="mt-4 rounded-lg ring-1 ring-panel panel-muted p-3 text-[11px] text-[var(--muted-foreground)]">
            Failed to load training calendar. {calendarError}
          </div>
        ) : (
          <div className="mt-4 space-y-6">
            <TrainingWorkspaceClient
              programId={programId}
              weekFrom={weekFrom}
              weekTo={weekTo}
              events={calendarEvents}
              teamId={practiceNav.teamId}
              teamSeasonId={practiceNav.teamSeasonId}
              initialSelectedDate={selectedDateKey ?? undefined}
              weeklyWeather={weeklyWeather as any}
            />

          </div>
        )}
      </section>
      </div>
    </div>
  );
}