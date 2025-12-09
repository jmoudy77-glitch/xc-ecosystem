//app/programs/[programId]/teams/[teamId]/seasons/[seasonId]/practice/page.tsx
import React from "react";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import AddPracticeDialogTrigger from "./AddPracticeDialogTrigger";
import { getWeeklyWeatherFromTomorrowIo } from "@/lib/weather/tomorrow";

type PracticePageParams = {
  programId: string;
  teamId: string;
  seasonId: string; // 👈 this must say seasonId now
};

type PracticePageProps = {
  params: Promise<PracticePageParams>;
};

type PracticePlan = {
  id: string;
  program_id: string;
  team_season_id: string | null;
  practice_date: string;
  start_time: string | null;
  end_time?: string | null;
  location: string | null;
  label: string;
  notes: string | null;
  status: string;
};

function formatISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
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

export default async function PracticePage({ params }: PracticePageProps) {
  const { programId, teamId, seasonId } = await params; // 👈 seasonId here

  const today = new Date();

  // Monday–Sunday week range
  const dayOfWeek = today.getDay(); // 0 = Sunday
  const diffToMonday = (dayOfWeek + 6) % 7;

  const startOfWeek = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - diffToMonday
  );
  const endOfWeek = new Date(
    startOfWeek.getFullYear(),
    startOfWeek.getMonth(),
    startOfWeek.getDate() + 6
  );

  const practicePlans = await getPracticePlansForSeason({
    teamSeasonId: seasonId, // 👈 map URL param into query param
    startDate: formatISODate(startOfWeek),
    endDate: formatISODate(endOfWeek),
  });

  // TODO: Replace with real program location when available
  const lat = 32.0;
  const lon = -90.0;

  const weeklyWeather = await getWeeklyWeatherFromTomorrowIo({
    lat,
    lon,
    startDateIso: formatISODate(startOfWeek),
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2 border-b border-slate-800 pb-4">
        <p className="text-xs uppercase tracking-widest text-slate-400">
          Team Practice
        </p>
        <h1 className="text-2xl md:text-3xl font-semibold text-slate-50">
          Practice Scheduler
        </h1>
        <p className="text-sm text-slate-400 max-w-2xl">
          Plan practices for this season. This page will evolve into a
          weather-aware practice planner with templates and AI-assisted
          suggestions.
        </p>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
          <span className="rounded-full border border-slate-700/80 px-2 py-0.5">
            Program: <code className="ml-1">{programId}</code>
          </span>
          <span className="rounded-full border border-slate-700/80 px-2 py-0.5">
            Team: <code className="ml-1">{teamId}</code>
          </span>
          <span className="rounded-full border border-slate-700/80 px-2 py-0.5">
            Season: <code className="ml-1">{seasonId}</code>
          </span>
        </div>
      </header>

      <main className="space-y-4">
        {/* Calendar + weather surface */}
        <section className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                Practice calendar
              </h2>
              <p className="text-xs text-slate-500">
                High-level weekly view. We&apos;ll plug in the actual calendar
                component and live weather data next.
              </p>
            </div>
            <div className="flex gap-2 text-[11px] text-slate-500">
              <button
                type="button"
                className="rounded-lg border border-slate-700/80 px-2 py-1 text-xs hover:border-slate-500 hover:text-slate-200"
              >
                Today
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-700/80 px-2 py-1 text-xs hover:border-slate-500 hover:text-slate-200"
              >
                This week
              </button>
            </div>
          </div>

          {/* Calendar */}
          <div className="flex h-[460px] flex-col gap-4 rounded-lg border border-dashed border-slate-700/80 bg-slate-950/60 p-4">
            <div className="mb-2 text-xs text-slate-500">
              Week of{" "}
              <span className="font-medium text-slate-200">
                {formatDisplayDate(startOfWeek)}
              </span>{" "}
              –{" "}
              <span className="font-medium text-slate-200">
                {formatDisplayDate(endOfWeek)}
              </span>
              .
            </div>

            <div className="flex-1 overflow-hidden rounded-lg border border-slate-800/80 bg-slate-950/80">
              <div className="grid h-full grid-cols-1 divide-y divide-slate-800/80 md:grid-cols-7 md:divide-y-0 md:divide-x">
                {Array.from({ length: 7 }).map((_, idx) => {
                  const dayDate = new Date(
                    startOfWeek.getFullYear(),
                    startOfWeek.getMonth(),
                    startOfWeek.getDate() + idx
                  );
                  const dayKey = formatISODate(dayDate);

                  const dayPlans = practicePlans.filter(
                    (plan) => plan.practice_date === dayKey
                  );

                  const dayLabel = dayDate.toLocaleDateString("en-US", {
                    weekday: "short",
                  });
                  const dayNum = dayDate.getDate();

                  return (
                    <div
                      key={dayKey}
                      className="flex flex-col border-slate-800/80 last:border-r-0"
                    >
                      {/* Day header */}
                      <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-950 px-2 py-1.5">
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase tracking-wide text-slate-400">
                            {dayLabel}
                          </span>
                          <span className="text-sm font-semibold text-slate-100">
                            {dayNum}
                          </span>
                        </div>
                      </div>

                      {/* Day body */}
                      <div className="flex-1 space-y-1.5 overflow-y-auto px-1.5 py-1.5 text-xs">
                        <AddPracticeDialogTrigger
                          programId={programId}
                          teamId={teamId}
                          seasonId={seasonId}
                          dateIso={dayKey}
                        />

                        {dayPlans.length === 0 ? (
                          <div className="mt-1 text-[10px] text-slate-600">
                            No scheduled practices.
                          </div>
                        ) : (
                          dayPlans.map((plan) => (
                            <div
                              key={plan.id}
                              className="rounded-md border border-slate-700/80 bg-slate-900/80 px-2 py-1.5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-medium text-slate-100">
                                  {plan.label}
                                </span>
                                <span className="rounded-full border border-slate-700/80 px-1.5 py-[1px] text-[9px] uppercase tracking-wide text-slate-400">
                                  {plan.status}
                                </span>
                              </div>
                              {plan.location && (
                                <div className="mt-0.5 text-[10px] text-slate-500">
                                  {plan.location}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Weather strip aligned with the 7-day calendar */}
          <div className="mt-4 rounded-lg border border-slate-800/80 bg-slate-950/80 p-3 md:sticky md:bottom-4">
            <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
              <span>Weather snapshot for this week</span>
              <span className="rounded-full border border-slate-700/80 px-2 py-0.5 text-[10px]">
                Aligned by calendar day
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2 text-[11px] md:grid-cols-7">
              {weeklyWeather.map((day) => {
                const dayDate = new Date(day.dateIso);
                const dayLabel = dayDate.toLocaleDateString("en-US", {
                  weekday: "short",
                });

                let riskLabel = "";
                let riskClass =
                  "border-slate-800 bg-slate-950/90 text-slate-500";

                // Simple condition-based icon from Tomorrow.io summary
                const summaryLower = (day.summary ?? "").toLowerCase();
                let conditionIcon = "☀️";

                if (!day.summary) {
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

                switch (day.heatRisk) {
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
                    break;
                }

                return (
                  <div
                    key={`weather-${day.dateIso}`}
                    className={`rounded-md border px-2 py-1.5 ${riskClass}`}
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
                      <span
                        className="text-[10px] font-medium"
                        title={
                          day.heatRisk === "low"
                            ? "Low heat risk: normal practice load is generally safe."
                            : day.heatRisk === "moderate"
                            ? "Moderate heat risk: consider extra hydration and brief shade breaks."
                            : day.heatRisk === "high"
                            ? "High heat risk: shorten intense sessions and add cooling/shade."
                            : "Extreme heat risk: use extreme caution; consider rescheduling or significantly modifying practice."
                        }
                      >
                        {riskLabel} heat risk
                      </span>
                    </div>
                    <div className="space-y-0.5 text-[10px]">
                      <div>
                        Wet bulb:{" "}
                        {day.wetBulbF != null
                          ? `${day.wetBulbF.toFixed(1)}°F`
                          : "—"}
                      </div>
                      <div>
                        Temp:{" "}
                        {day.tempMinF != null && day.tempMaxF != null
                          ? `${day.tempMinF.toFixed(
                              0
                            )}–${day.tempMaxF.toFixed(0)}°F`
                          : "—"}
                      </div>
                      <div>
                        Wind:{" "}
                        {day.windMph != null
                          ? `${day.windMph.toFixed(0)} mph`
                          : "—"}
                      </div>
                      <div>Conditions: {day.summary ?? "—"}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}