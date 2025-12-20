//app/programs/[programId]/teams/[teamId]/seasons/[seasonId]/practice/page.tsx
import React from "react";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import AddPracticeDialogTrigger from "./AddPracticeDialogTrigger";
import { getWeeklyWeatherFromTomorrowIo } from "@/lib/weather/tomorrow";
import { getHeatPolicyForTeamSeason } from "@/lib/heatPolicies";
import HeatPolicyPopover from "./HeatPolicyPopover";
import PracticePlanCard from "./PracticePlanCard";
import Link from "next/link";

type PracticePageParams = {
  programId: string;
  teamId: string;
  seasonId: string; // 👈 this must say seasonId now
};

type PracticePageProps = {
  params: Promise<PracticePageParams>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

type PracticePlan = {
  id: string;
  program_id: string;
  team_season_id: string | null;
  practice_date: string;        // NOT optional
  start_time: string | null;    // timestamptz, nullable
  end_time: string | null;      // timestamptz, nullable
  location: string | null;
  label: string;
  notes: string | null;
  status: string;
};

type ProgramRow = {
  id: string;
  school_id: string;
};

type SchoolLocationRow = {
  latitude: number | null;
  longitude: number | null;
};

type TeamNameRow = {
  id: string;
  name: string;
};

type TeamSeasonLabelRow = {
  id: string;
  season_label: string;
  academic_year: string;
};

type TeamRosterRow = {
  id: string;
  athlete_id: string;
  event_group: string | null;
};

type AthleteRowForGroup = {
  id: string;
  first_name: string;
  last_name: string;
  event_group: string | null;
};

type PracticeGroupUI = {
  name: string;
  eventGroup?: string | null;
  athletes: { id: string; name: string }[];
};

// --- Practice group, assignment, session, and popover types ---
type PracticeGroupRow = {
  id: string;
  practice_plan_id: string;
  label: string;
  event_group: string | null;
};

type PracticeGroupAssignmentRow = {
  practice_group_id: string;
  athlete_id: string | null;
  team_roster_id: string | null;
};

type AthleteBasicRow = {
  id: string;
  first_name: string;
  last_name: string;
  event_group: string | null;
};

type AthleteTrainingSessionRow = {
  id: string;
  practice_plan_id: string;
  athlete_id: string | null;
  practice_group_id: string | null;
  title: string | null;
  workout_category: string | null;
};

type PracticeGroupDetailForPopover = {
  id: string;
  label: string;
  event_group: string | null;
  athletes: {
    id: string;
    name: string;
    event_group: string | null;
  }[];
};

type IndividualSessionForPopover = {
  id: string;
  athleteName: string;
  event_group: string | null;
  title: string | null;
  workout_category: string | null;
};

type PracticePopoverData = {
  groups: PracticeGroupDetailForPopover[];
  individualSessions: IndividualSessionForPopover[];
};

async function getProgramLocationCoords(
  programId: string
): Promise<{ lat: number | null; lon: number | null }> {
  const supabase = await supabaseServerComponent();

  // 1) Look up the program to get its school_id
  const { data: program, error: programError } = await supabase
    .from("programs")
    .select("id, school_id")
    .eq("id", programId)
    .single<ProgramRow>();

  if (programError || !program) {
    console.warn(
      "[PracticePage] Failed to load program for location lookup:",
      programError || "not found"
    );
    return { lat: null, lon: null };
  }

  // 2) Look up the school's stored latitude/longitude
  const { data: school, error: schoolError } = await supabase
    .from("schools")
    .select("latitude, longitude")
    .eq("id", program.school_id)
    .single<SchoolLocationRow>();

  if (schoolError || !school) {
    console.warn(
      "[PracticePage] Failed to load school location for program:",
      schoolError || "not found"
    );
    return { lat: null, lon: null };
  }

  return {
    lat: school.latitude,
    lon: school.longitude,
  };
}

function formatGroupLabel(key: string): string {
  if (!key) return "Unassigned";
  const cleaned = key.replace(/_/g, " ").toLowerCase();
  return cleaned.replace(/\b\w/g, (ch) => ch.toUpperCase());
}

async function getRosterGroupsForSeason(
  teamSeasonId: string
): Promise<PracticeGroupUI[]> {
  const supabase = await supabaseServerComponent();

  const { data: roster, error: rosterError } = await supabase
    .from("team_roster")
    .select("id, athlete_id, event_group")
    .eq("team_season_id", teamSeasonId);

  if (rosterError) {
    console.error(
      "[PracticePage] team_roster query error for groups:",
      rosterError.message || rosterError
    );
    return [];
  }

  const rosterRows = (roster ?? []) as TeamRosterRow[];

  const athleteIds = Array.from(
    new Set(
      rosterRows
        .map((row) => row.athlete_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  if (athleteIds.length === 0) {
    return [];
  }

  const { data: athletes, error: athletesError } = await supabase
    .from("athletes")
    .select("id, first_name, last_name, event_group")
    .in("id", athleteIds);

  if (athletesError) {
    console.error(
      "[PracticePage] athletes query error for groups:",
      athletesError.message || athletesError
    );
    return [];
  }

  const athleteRows = (athletes ?? []) as AthleteRowForGroup[];
  const athleteById = new Map<string, AthleteRowForGroup>();
  for (const a of athleteRows) {
    athleteById.set(a.id, a);
  }

  const groupsMap = new Map<string, PracticeGroupUI>();

  for (const row of rosterRows) {
    const athlete = athleteById.get(row.athlete_id);
    if (!athlete) continue;

    const rawGroupKey =
      row.event_group || athlete.event_group || "Unassigned";
    const groupKey = rawGroupKey || "Unassigned";
    const label = formatGroupLabel(groupKey);

    if (!groupsMap.has(groupKey)) {
      groupsMap.set(groupKey, {
        name: label,
        eventGroup: rawGroupKey,
        athletes: [],
      });
    }

    const group = groupsMap.get(groupKey)!;
    group.athletes.push({
      id: athlete.id,
      name: `${athlete.first_name} ${athlete.last_name}`,
    });
  }

  // Return groups sorted by name for stable UI.
  return Array.from(groupsMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

// --- Practice details loader for popover ---
async function getPracticeDetailsForPlans(
  practicePlanIds: string[]
): Promise<Record<string, PracticePopoverData>> {
  if (practicePlanIds.length === 0) {
    return {};
  }

  const supabase = await supabaseServerComponent();

  // 1) Load practice groups for these plans
  const { data: groupsData, error: groupsError } = await supabase
    .from("practice_groups")
    .select("id, practice_plan_id, label, event_group")
    .in("practice_plan_id", practicePlanIds);

  if (groupsError) {
    console.error(
      "[PracticePage] practice_groups query error:",
      groupsError.message || groupsError
    );
  }

  const groupRows = (groupsData ?? []) as PracticeGroupRow[];
  const groupIds = groupRows.map((g) => g.id);

  // 2) Load group assignments
  let assignmentRows: PracticeGroupAssignmentRow[] = [];
  if (groupIds.length > 0) {
    const { data: assignmentsData, error: assignmentsError } = await supabase
      .from("practice_group_assignments")
      .select("practice_group_id, athlete_id, team_roster_id")
      .in("practice_group_id", groupIds);

    if (assignmentsError) {
      console.error(
        "[PracticePage] practice_group_assignments query error:",
        assignmentsError.message || assignmentsError
      );
    }

    assignmentRows = (assignmentsData ?? []) as PracticeGroupAssignmentRow[];
  }

  // 3) Load athlete training sessions for these plans
  const { data: sessionsData, error: sessionsError } = await supabase
    .from("athlete_training_sessions")
    .select(
      "id, practice_plan_id, athlete_id, practice_group_id, title, workout_category"
    )
    .in("practice_plan_id", practicePlanIds);

  if (sessionsError) {
    console.error(
      "[PracticePage] athlete_training_sessions query error:",
      sessionsError.message || sessionsError
    );
  }

  const sessionRows = (sessionsData ?? []) as AthleteTrainingSessionRow[];

  // 4) Collect athlete ids and load basic info
  const athleteIdSet = new Set<string>();
  for (const row of assignmentRows) {
    if (row.athlete_id) athleteIdSet.add(row.athlete_id);
  }
  for (const row of sessionRows) {
    if (row.athlete_id) athleteIdSet.add(row.athlete_id);
  }

  const athleteIds = Array.from(athleteIdSet);
  const athleteById = new Map<string, AthleteBasicRow>();

  if (athleteIds.length > 0) {
    const { data: athletesData, error: athletesError } = await supabase
      .from("athletes")
      .select("id, first_name, last_name, event_group")
      .in("id", athleteIds);

    if (athletesError) {
      console.error(
        "[PracticePage] athletes query error for practice details:",
        athletesError.message || athletesError
      );
    }

    const athleteRows = (athletesData ?? []) as AthleteBasicRow[];
    for (const a of athleteRows) {
      athleteById.set(a.id, a);
    }
  }

  // 5) Build detail map keyed by practice_plan_id
  const detailsByPlanId = new Map<string, PracticePopoverData>();

  // Initialize entries so every practice has a data object
  for (const planId of practicePlanIds) {
    detailsByPlanId.set(planId, { groups: [], individualSessions: [] });
  }

  // Map of groupId -> group detail
  const groupDetailById = new Map<string, PracticeGroupDetailForPopover>();

  for (const g of groupRows) {
    const base: PracticeGroupDetailForPopover = {
      id: g.id,
      label: g.label,
      event_group: g.event_group,
      athletes: [],
    };
    groupDetailById.set(g.id, base);

    const container = detailsByPlanId.get(g.practice_plan_id);
    if (container) {
      container.groups.push(base);
    } else {
      detailsByPlanId.set(g.practice_plan_id, {
        groups: [base],
        individualSessions: [],
      });
    }
  }

  // Attach athletes to groups
  for (const a of assignmentRows) {
    if (!a.athlete_id) continue;
    const athlete = athleteById.get(a.athlete_id);
    const group = groupDetailById.get(a.practice_group_id);
    if (!group || !athlete) continue;

    group.athletes.push({
      id: athlete.id,
      name: `${athlete.first_name} ${athlete.last_name}`,
      event_group: athlete.event_group,
    });
  }

  // Build individual session summaries
  for (const s of sessionRows) {
    const container = detailsByPlanId.get(s.practice_plan_id);
    if (!container) continue;

    const athlete = s.athlete_id ? athleteById.get(s.athlete_id) : undefined;
    const athleteName = athlete
      ? `${athlete.first_name} ${athlete.last_name}`
      : "Unknown athlete";

    container.individualSessions.push({
      id: s.id,
      athleteName,
      event_group: athlete?.event_group ?? null,
      title: s.title,
      workout_category: s.workout_category,
    });
  }

  const result: Record<string, PracticePopoverData> = {};
  for (const [planId, details] of detailsByPlanId.entries()) {
    result[planId] = details;
  }

  return result;
}

function formatISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parse a YYYY-MM-DD string into a local Date (no UTC shift).
 */
function parseLocalISODate(isoDate: string): Date {
  const [yearStr, monthStr, dayStr] = isoDate.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  return new Date(year, month - 1, day);
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatTimeRange(
  startTime: string | null,
  endTime?: string | null
): string | null {
  if (!startTime) return null;

  const start = new Date(startTime);
  if (isNaN(start.getTime())) return null;

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
  };

  const startLabel = start.toLocaleTimeString("en-US", timeOptions);

  if (!endTime) {
    return startLabel;
  }

  const end = new Date(endTime);
  if (isNaN(end.getTime())) {
    return startLabel;
  }

  const endLabel = end.toLocaleTimeString("en-US", timeOptions);
  return `${startLabel} – ${endLabel}`;
}

async function getPracticePlansForSeason(args: {
  teamSeasonId: string;
  startDate: string;
  endDate: string;
}): Promise<PracticePlan[]> {
  const supabase = await supabaseServerComponent();

  const { data, error } = await supabase
    .from("practice_plans")
    .select(
      "id, program_id, team_season_id, practice_date, start_time, end_time, location, label, notes, status"
    )
    .eq("team_season_id", args.teamSeasonId)
    .gte("practice_date", args.startDate)
    .lte("practice_date", args.endDate)
    .order("practice_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    console.error(
      "[PracticePage] practice_plans query error:",
      error.message || error
    );
    return [];
  }

  return (data ?? []) as PracticePlan[];
}

export default async function PracticePage({
  params,
  searchParams,
}: PracticePageProps) {
  const { programId, teamId, seasonId } = await params; // 👈 seasonId here

  // Resolve simple header context (team + season)
  const supabaseForHeader = await supabaseServerComponent();

  const { data: teamRow } = await supabaseForHeader
    .from("teams")
    .select("id, name")
    .eq("id", teamId)
    .maybeSingle<TeamNameRow>();

  const { data: seasonRow } = await supabaseForHeader
    .from("team_seasons")
    .select("id, season_label, academic_year")
    .eq("id", seasonId)
    .maybeSingle<TeamSeasonLabelRow>();

  const headerTeamName = teamRow?.name ?? "Team";
  const headerSeasonLabel = seasonRow?.season_label ?? "Season";
  const headerAcademicYear = seasonRow?.academic_year ?? "";

  // Determine startOfWeek from ?week=YYYY-MM-DD search param (from server props)
  const resolvedSearchParams =
    searchParams ? await searchParams : ({} as { [key: string]: string | string[] | undefined });

  const rawWeek = resolvedSearchParams.week;
  const weekParam =
    typeof rawWeek === "string"
      ? rawWeek
      : Array.isArray(rawWeek)
      ? rawWeek[0]
      : null;

  const rawEditId = resolvedSearchParams.editPracticeId;
  const editPracticeId =
    typeof rawEditId === "string"
      ? rawEditId
      : Array.isArray(rawEditId)
      ? rawEditId[0]
      : null;

  const rawEditTs = resolvedSearchParams.editTs;
  const editTs =
    typeof rawEditTs === "string"
      ? rawEditTs
      : Array.isArray(rawEditTs)
      ? rawEditTs[0]
      : null;

  const rawReturnTo = resolvedSearchParams.returnTo;
  const returnTo =
    typeof rawReturnTo === "string"
      ? rawReturnTo
      : Array.isArray(rawReturnTo)
      ? rawReturnTo[0]
      : null;

  const backHref = returnTo ?? `/programs/${programId}/training`;

  const baseDate = weekParam ? parseLocalISODate(weekParam) : new Date();

  // Get current auth user (Supabase auth user id)
  const supabaseForAuth = await supabaseServerComponent();
  const {
    data: authData,
    error: authError,
  } = await supabaseForAuth.auth.getUser();

  if (authError) {
    console.warn(
      "[PracticePage] Failed to get auth user:",
      authError.message || authError
    );
  }

  const authUserId = authData?.user?.id ?? null;

  // Sunday–Saturday week range
  const dayOfWeek = baseDate.getDay(); // 0 = Sunday
  const diffToSunday = dayOfWeek; // days since Sunday (0 if Sunday)

  const startOfWeek = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate() - diffToSunday
  );

  const endOfWeek = new Date(
    startOfWeek.getFullYear(),
    startOfWeek.getMonth(),
    startOfWeek.getDate() + 6
  );

  const prevWeek = new Date(startOfWeek);
    prevWeek.setDate(prevWeek.getDate() - 7);

    const nextWeek = new Date(startOfWeek);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const todayKey = formatISODate(new Date());

    const practicePlans = await getPracticePlansForSeason({
      teamSeasonId: seasonId, // 👈 map URL param into query param
      startDate: formatISODate(startOfWeek),
      endDate: formatISODate(endOfWeek),
  });
  const rosterGroups = await getRosterGroupsForSeason(seasonId);

  const practiceDetailsByPlanId = await getPracticeDetailsForPlans(
    practicePlans.map((p) => p.id)
  );

  const editPractice =
    editPracticeId != null
      ? practicePlans.find((p) => p.id === editPracticeId) ?? null
      : null;

  const editDetails =
    editPractice != null
      ? practiceDetailsByPlanId[editPractice.id] ?? {
          groups: [],
          individualSessions: [],
        }
      : null;

  const editPracticeDateKey =
    editPractice != null && editPractice.practice_date
      ? editPractice.practice_date.slice(0, 10)
      : null;

  const { lat: programLat, lon: programLon } = await getProgramLocationCoords(
    programId
  );

  // Fallback to a generic location if we don't have coordinates stored yet
  const lat = programLat ?? 32.0;
  const lon = programLon ?? -90.0;

  const weeklyWeather = await getWeeklyWeatherFromTomorrowIo({
    lat,
    lon,
    startDateIso: formatISODate(startOfWeek),
  });
  const heatPolicy = await getHeatPolicyForTeamSeason({
    teamSeasonId: seasonId,
    autoAttachToSeason: false,
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-xl panel bg-panel/70 px-4 py-3 backdrop-blur-2xl ring-1 ring-white/10 shadow-[0_18px_70px_rgba(0,0,0,0.28)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(900px_120px_at_50%_0%,rgba(255,255,255,0.08),transparent_70%)]" />
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="mt-0.5 truncate text-sm font-semibold text-[var(--foreground)]">
              {headerTeamName}
              <span className="mx-2 text-[var(--muted-foreground)]">•</span>
              {headerSeasonLabel}
              {headerAcademicYear ? (
                <span className="ml-2 text-[12px] font-medium text-[var(--muted-foreground)]">{headerAcademicYear}</span>
              ) : null}
            </div>
          </div>
          <Link
            href={backHref}
            className="inline-flex items-center rounded-lg bg-panel-muted/35 px-3 py-2 text-xs font-medium text-[var(--foreground)] ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl hover:bg-panel-muted/50 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/35"
          >
            ← Back to Training
          </Link>
        </div>
      </div>

      <main className="space-y-4 w-full">
        {/* Calendar + weather surface */}
        <section className="relative w-full overflow-visible rounded-xl panel bg-panel/70 p-5 backdrop-blur-2xl ring-1 ring-white/10 shadow-[0_22px_90px_rgba(0,0,0,0.30)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(1100px_180px_at_50%_0%,rgba(255,255,255,0.08),transparent_70%)]" />
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-[var(--foreground)]">
                Practice calendar
              </h2>
              <p className="text-xs text-[var(--muted-foreground)]">
                High-level weekly view with practice cards and quick access to
                the builder. Use it to see and adjust the flow of the week.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/programs/${programId}/teams/${teamId}/seasons/${seasonId}/practice?week=${formatISODate(
                  prevWeek
                )}`}
                className="rounded-lg bg-panel-muted/35 px-3 py-2 text-[11px] font-medium text-[var(--foreground)] ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl hover:bg-panel-muted/50 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/35"
              >
                ‹ Prev
              </Link>

              <Link
                href={`/programs/${programId}/teams/${teamId}/seasons/${seasonId}/practice?week=${formatISODate(
                  (() => {
                    const today = new Date();
                    const day = today.getDay(); // 0 = Sunday
                    const diffToSunday = day; // days since Sunday
                    const sunday = new Date(
                      today.getFullYear(),
                      today.getMonth(),
                      today.getDate() - diffToSunday
                    );
                    return sunday;
                  })()
                )}`}
                className="rounded-lg bg-panel-muted/35 px-3 py-2 text-[11px] font-medium text-[var(--foreground)] ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl hover:bg-panel-muted/50 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/35"
              >
                Today
              </Link>

              <Link
                href={`/programs/${programId}/teams/${teamId}/seasons/${seasonId}/practice?week=${formatISODate(
                  nextWeek
                )}`}
                className="rounded-lg bg-panel-muted/35 px-3 py-2 text-[11px] font-medium text-[var(--foreground)] ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl hover:bg-panel-muted/50 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/35"
              >
                Next ›
              </Link>
            </div>
          </div>

          {/* Calendar */}
          <div className="flex flex-col gap-4 rounded-xl bg-panel-muted/30 p-4 ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl">
            <div className="mb-2 text-xs text-[var(--muted-foreground)]">
              Week of{" "}
              <span className="font-medium text-[var(--foreground)]">
                {formatDisplayDate(startOfWeek)}
              </span>{" "}
              –{" "}
              <span className="font-medium text-[var(--foreground)]">
                {formatDisplayDate(endOfWeek)}
              </span>
              .
            </div>

            <div className="rounded-xl bg-panel/65 ring-1 ring-white/10 shadow-[0_14px_55px_rgba(0,0,0,0.28)] backdrop-blur-2xl">
              <div className="grid grid-cols-1 divide-y divide-[var(--border)]/40 md:grid-cols-7 md:divide-y-0 md:divide-x">
                {Array.from({ length: 7 }).map((_, idx) => {
                  const dayDate = new Date(
                    startOfWeek.getFullYear(),
                    startOfWeek.getMonth(),
                    startOfWeek.getDate() + idx
                  );
                  const dayKey = formatISODate(dayDate);

                  const dayPlans = practicePlans.filter((plan) => {
                    if (!plan.practice_date) return false;
                    // Normalize to YYYY-MM-DD in case practice_date is a full ISO timestamp.
                    const dateOnly = plan.practice_date.slice(0, 10);
                    return dateOnly === dayKey;
                  });

                    const dayLabel = dayDate.toLocaleDateString("en-US", {
                        weekday: "short",
                      });
                      const dayNum = dayDate.getDate();
                      const isToday = dayKey === todayKey;

                  
                  return (
                    <div
                      key={dayKey}
                      className="flex min-h-[220px] flex-col"
                    >
                      {/* Day header */}
                      <div
                        className={`flex items-center justify-between border-b px-2 py-1.5 ${
                          isToday
                            ? "border-[var(--brand)]/50 bg-[var(--brand)]/10"
                            : "border-[var(--border)]/50 bg-panel"
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]">
                            {dayLabel}
                          </span>
                          <span className="text-sm font-semibold text-[var(--foreground)]">
                            {dayNum}
                          </span>
                        </div>
                        {isToday && (
                          <span className="rounded-full bg-[var(--brand)]/14 px-2 py-[2px] text-[10px] font-semibold uppercase tracking-wide text-[var(--foreground)] ring-1 ring-[var(--brand)]/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-xl">
                            Today
                          </span>
                        )}
                      </div>

                      {/* Day body */}
                      <div className="flex-1 space-y-2 px-2 py-2 pb-6 text-xs">
                        <AddPracticeDialogTrigger
                          key={
                            editPractice &&
                            editPracticeDateKey === dayKey &&
                            editTs
                              ? `${dayKey}-${editPractice.id}-${editTs}`
                              : dayKey
                          }
                          programId={programId}
                          teamId={teamId}
                          seasonId={seasonId}
                          teamName={headerTeamName}
                          seasonName={`${headerSeasonLabel}${headerAcademicYear ? ` ${headerAcademicYear}` : ""}`}
                          dateIso={dayKey}
                          groups={rosterGroups}
                          initialPractice={
                            editPractice && editPracticeDateKey === dayKey
                              ? editPractice
                              : undefined
                          }
                          initialDetails={
                            editPractice &&
                            editPracticeDateKey === dayKey &&
                            editDetails
                              ? editDetails
                              : undefined
                          }
                          autoOpen={
                            !!editPractice && editPracticeDateKey === dayKey
                          }
                        />

                        {dayPlans.length === 0 ? (
                          <div className="mt-1 text-[10px] text-[var(--muted-foreground)]">
                            No scheduled practices.
                          </div>
                        ) : (
                          dayPlans.map((plan) => {
                            const details = practiceDetailsByPlanId[plan.id] ?? {
                              groups: [],
                              individualSessions: [],
                            };

                            return (
                              <PracticePlanCard
                                key={plan.id}
                                plan={plan}
                                programId={programId}
                                teamId={teamId}
                                seasonId={seasonId}
                                groups={details.groups}
                                individualSessions={details.individualSessions}
                              />
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Weather strip aligned with the 7-day calendar */}
          <div className="relative z-0 mt-4 overflow-visible rounded-xl bg-panel/70 p-4 backdrop-blur-2xl ring-1 ring-white/10 shadow-[0_18px_70px_rgba(0,0,0,0.28)] md:sticky md:bottom-4">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(900px_140px_at_50%_0%,rgba(255,255,255,0.08),transparent_70%)]" />
            <div className="mb-2 flex items-center justify-between text-xs text-[var(--muted-foreground)]">
              <span>Weather snapshot for this week</span>
              <span className="rounded-full bg-panel-muted/35 px-2 py-0.5 text-[10px] ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
                Aligned by calendar day
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2 text-[11px] md:grid-cols-7">
              {Array.from({ length: 7 }).map((_, idx) => {
                const dayDate = new Date(
                  startOfWeek.getFullYear(),
                  startOfWeek.getMonth(),
                  startOfWeek.getDate() + idx
                );
                const dayLabel = dayDate.toLocaleDateString("en-US", {
                  weekday: "short",
                });
                const dateIso = formatISODate(dayDate);

                const weather = weeklyWeather.find((w) => {
                  if (!w.dateIso) return false;
                  const dateOnly = w.dateIso.slice(0, 10);
                  return dateOnly === dateIso;
                });

                let riskLabel = "";
                let riskClass =
                  "border-[var(--border)]/50 bg-panel text-[var(--muted-foreground)]";

                // Simple condition-based icon from Tomorrow.io summary
                const summaryLower = (weather?.summary ?? "").toLowerCase();
                let conditionIcon = "☀️";

                if (!weather?.summary) {
                  conditionIcon = "▫️";
                } else if (summaryLower.includes("thunder")) {
                  conditionIcon = "⛈️";
                } else if (summaryLower.includes("snow")) {
                  conditionIcon = "🌨️";
                } else if (
                  summaryLower.includes("rain") ||
                  summaryLower.includes("drizzle")
                ) {
                  conditionIcon = "🌧️";
                } else if (summaryLower.includes("fog")) {
                  conditionIcon = "🌫️";
                } else if (
                  summaryLower.includes("cloud") ||
                  summaryLower.includes("overcast")
                ) {
                  conditionIcon = "☁️";
                } else {
                  conditionIcon = "☀️";
                }

                switch (weather?.heatRisk) {
                  case "low":
                    riskLabel = "Low";
                    riskClass =
                      "border-emerald-700/70 bg-emerald-500/5 text-emerald-200";
                    break;
                  case "moderate":
                    riskLabel = "Moderate";
                    riskClass =
                      "border-yellow-600/70 bg-yellow-500/5 text-yellow-200";
                    break;
                  case "high":
                    riskLabel = "High";
                    riskClass =
                      "border-orange-600/70 bg-orange-500/5 text-orange-200";
                    break;
                  case "extreme":
                    riskLabel = "Extreme";
                    riskClass =
                      "border-red-700/70 bg-red-500/5 text-red-200";
                    break;
                  default:
                    riskLabel = "Unknown";
                    riskClass =
                      "border-[var(--border)]/50 bg-panel text-[var(--muted-foreground)]";
                    break;
                }

                return (
                  <HeatPolicyPopover
                    key={`weather-${dateIso}`}
                    riskLabel={`${riskLabel} heat risk`}
                    riskLevel={weather?.heatRisk ?? "unknown"}
                    policy={heatPolicy}
                    weather={
                      weather
                        ? {
                            wetBulbF: weather.wetBulbF,
                            wbgtF: weather.wbgtF,
                            tempMinF: weather.tempMinF,
                            tempMaxF: weather.tempMaxF,
                            humidityPercent: weather.humidityPercent,
                            windMph: weather.windMph,
                            summary: weather.summary,
                          }
                        : undefined
                    }
                  >
                    <div
                      className={`cursor-pointer rounded-md border px-2 py-1.5 ${riskClass}`}
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[12px]" aria-hidden="true">
                            {conditionIcon}
                          </span>
                          <span className="text-[10px] uppercase tracking-wide">
                            {dayLabel}
                          </span>
                        </div>
                        <span className="rounded-full ring-1 ring-panel bg-panel px-2 py-0.5 text-[10px]">
                          {riskLabel || "Unknown"}
                        </span>
                      </div>
                      <div className="space-y-0.5 text-[10px]">
                        <div>
                          Wet bulb:{" "}
                          {weather?.wetBulbF != null
                            ? `${weather.wetBulbF.toFixed(1)}°F`
                            : "—"}
                        </div>
                        <div>
                          Temp:{" "}
                          {weather?.tempMinF != null && weather?.tempMaxF != null
                            ? `${weather.tempMinF.toFixed(0)}–${weather.tempMaxF.toFixed(0)}°F`
                            : "—"}
                        </div>
                        <div>
                          Wind:{" "}
                          {weather?.windMph != null
                            ? `${weather.windMph.toFixed(0)} mph`
                            : "—"}
                        </div>
                        <div>Conditions: {weather?.summary ?? "—"}</div>
                      </div>
                    </div>
                  </HeatPolicyPopover>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}