//lib/heatPolicies.ts
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { getWeeklyWeatherFromTomorrowIo } from "@/lib/weather/tomorrow";

export type GoverningBody = "nfhs" | "ncaa" | "naia" | "other";

export type HeatRiskLevel = "low" | "moderate" | "high" | "extreme";

export type HeatPolicy = {
  id: string;
  label: string;
  governing_body: GoverningBody;
  level: string | null;
  sport: string | null;
  wbgt_unit: "F" | "C";
  low_max: number | null;
  moderate_min: number | null;
  moderate_max: number | null;
  high_min: number | null;
  high_max: number | null;
  extreme_min: number | null;
  guidelines_json: any;
  effective_year: number | null;
  source_primary_url: string | null;
  source_version: string | null;
  source_references: any;
  is_default: boolean;
};

type TeamSeasonRow = {
  id: string;
  program_id: string;
  team_id: string;
  season_year: number | null;
  governing_body: GoverningBody | null;
  heat_policy_id: string | null;
};

type TeamRow = {
  id: string;
  program_id: string;
  sport: string | null;
};

type ProgramRow = {
  id: string;
  sport: string | null;
};

export type GetHeatPolicyForTeamSeasonArgs = {
  teamSeasonId: string;
  /**
   * If true (default), when we auto-select a heat policy,
   * we will persist that policy id back onto team_seasons.heat_policy_id
   * as a cache for future calls.
   */
  autoAttachToSeason?: boolean;
};

/**
 * Internal: derive a policy "sport key" from team/program sport.
 * You can refine this mapping as you expand beyond XC/TF.
 */
function derivePolicySportKey(teamSport: string | null, programSport: string | null): string | null {
  const raw = (teamSport || programSport || "").toLowerCase();

  if (!raw) return null;

  if (raw.includes("xc") || raw.includes("cross") || raw.includes("distance")) {
    return "xc_tf"; // matches the example seeds we inserted
  }

  if (raw.includes("track") || raw.includes("tf")) {
    return "xc_tf";
  }

  // Fallback: just use the raw sport string
  return raw;
}

/**
 * Central brain for selecting the appropriate heat policy for a team season.
 *
 * Priority:
 *  1. If team_seasons.heat_policy_id is set -> return that policy.
 *  2. Else:
 *     a. Gather governing_body + sport + season_year context.
 *     b. Choose the best matching heat_policies row:
 *        - matching governing_body
 *        - matching sport or sport is null
 *        - effective_year <= season_year (if season_year is set)
 *        - prefer is_default = true
 *        - prefer highest effective_year
 *  3. Optionally write the chosen policy id back to team_seasons.heat_policy_id.
 */
export async function getHeatPolicyForTeamSeason(
  args: GetHeatPolicyForTeamSeasonArgs
): Promise<HeatPolicy | null> {
  const { teamSeasonId, autoAttachToSeason = true } = args;

  const supabase = await supabaseServerComponent();

  // 1) Load team_seasons row with team + program context
  const { data: teamSeason, error: tsError } = await supabase
    .from("team_seasons")
    .select("id, program_id, team_id, season_year, governing_body, heat_policy_id")
    .eq("id", teamSeasonId)
    .single<TeamSeasonRow>();

  if (tsError || !teamSeason) {
    console.error("[heatPolicies] Failed to load team_seasons row:", tsError || "not found");
    return null;
  }

  // If an explicit heat_policy_id is set, respect it and return that policy.
  if (teamSeason.heat_policy_id) {
    const { data: policy, error: hpError } = await supabase
      .from("heat_policies")
      .select("*")
      .eq("id", teamSeason.heat_policy_id)
      .single<HeatPolicy>();

    if (hpError || !policy) {
      console.error(
        "[heatPolicies] heat_policy_id is set but policy not found:",
        hpError || "not found"
      );
      // fall through to auto discovery below
    } else {
      return policy;
    }
  }

  // 2) Auto-discover policy based on governing body, sport, and season year

  // a) Load team + program to derive sport key
  const [{ data: team, error: teamError }, { data: program, error: progError }] = await Promise.all([
    supabase
      .from("teams")
      .select("id, program_id, sport")
      .eq("id", teamSeason.team_id)
      .single<TeamRow>(),
    supabase
      .from("programs")
      .select("id, sport")
      .eq("id", teamSeason.program_id)
      .single<ProgramRow>(),
  ]);

  if (teamError) {
    console.warn("[heatPolicies] Failed to load team row for sport derivation:", teamError.message);
  }
  if (progError) {
    console.warn("[heatPolicies] Failed to load program row for sport derivation:", progError.message);
  }

  const governingBody = teamSeason.governing_body || null;
  const seasonYear = teamSeason.season_year;
  const sportKey = derivePolicySportKey(team?.sport ?? null, program?.sport ?? null);

  if (!governingBody) {
    console.warn(
      "[heatPolicies] No governing_body set on team_seasons; cannot auto-select policy."
    );
    return null;
  }

  // b) Build query for best matching policy
  let query = supabase
    .from("heat_policies")
    .select("*")
    .eq("governing_body", governingBody);

  if (sportKey) {
    // Either exact sport match OR generic policies where sport IS NULL
    query = query.in("sport", [sportKey, null as any]);
  }

  // We’ll filter effective_year <= seasonYear in app logic if seasonYear is set,
  // since Supabase query builders don’t support all combinations elegantly.
  const { data: allPolicies, error: hpListError } = await query;

  if (hpListError || !allPolicies || allPolicies.length === 0) {
    console.warn(
      "[heatPolicies] No heat_policies found for governing body and sport:",
      governingBody,
      sportKey,
      hpListError || ""
    );
    return null;
  }

  // c) Apply year + default preference in JS:
  const filtered = (allPolicies as HeatPolicy[]).filter((p) => {
    if (seasonYear != null && p.effective_year != null) {
      return p.effective_year <= seasonYear;
    }
    // if either is null, keep it as a generic policy candidate
    return true;
  });

  if (filtered.length === 0) {
    console.warn(
      "[heatPolicies] heat_policies found, but none matched season_year constraint; falling back to unfiltered list."
    );
  }

  const candidates = filtered.length > 0 ? filtered : (allPolicies as HeatPolicy[]);

  // Sort: highest effective_year first, is_default=true first, newest created_at if present
  candidates.sort((a, b) => {
    // 1) effective_year desc (nulls last)
    const aYear = a.effective_year ?? -9999;
    const bYear = b.effective_year ?? -9999;
    if (aYear !== bYear) return bYear - aYear;

    // 2) is_default true first
    if (a.is_default !== b.is_default) {
      return a.is_default ? -1 : 1;
    }

    // 3) no created_at in type, but DB has it — if Supabase returns it, we can try to compare.
    //    For now, leave as is.
    return 0;
  });

  const chosen = candidates[0] ?? null;

  if (!chosen) {
    console.warn("[heatPolicies] No candidate heat policy could be chosen.");
    return null;
  }

  // 3) Optionally attach chosen policy back to team_seasons as cache
  if (autoAttachToSeason && !teamSeason.heat_policy_id) {
    const { error: updateError } = await supabase
      .from("team_seasons")
      .update({ heat_policy_id: chosen.id })
      .eq("id", teamSeason.id);

    if (updateError) {
      console.warn(
        "[heatPolicies] Failed to attach chosen heat_policy_id back to team_seasons:",
        updateError.message
      );
    }
  }

  return chosen;
}

// --- WBGT classification + practice snapshot helpers -----------------------

export type RecordPracticeWeatherSnapshotArgs = {
  practicePlanId: string;
  teamSeasonId: string;

  // WBGT and ambient conditions (F/mph, matching how we display in the UI)
  wbgtF: number | null;
  tempF?: number | null;
  humidityPercent?: number | null;
  windMph?: number | null;

  weatherCode?: number | null;
  weatherSummary?: string | null;

  // Location context
  locationText?: string | null;
  locationLat?: number | null;
  locationLon?: number | null;

  // Raw provider payload (e.g., Tomorrow.io interval JSON)
  rawConditionsJson?: any;

  // Data source
  source?: "tomorrow_io" | "manual";
};

function fToC(valueF: number | null | undefined): number | null {
  if (valueF == null) return null;
  return ((valueF - 32) * 5) / 9;
}

function mphToKph(valueMph: number | null | undefined): number | null {
  if (valueMph == null) return null;
  return valueMph / 0.621371;
}

/**
 * Given a heat policy and a WBGT reading in Fahrenheit, classify heat risk.
 *
 * We respect the policy's wbgt_unit:
 *  - If policy.wbgt_unit === 'F', compare WBGT in F directly to thresholds.
 *  - If policy.wbgt_unit === 'C', convert the WBGT F reading to C, then compare.
 *
 * Returns null when classification is not possible due to missing thresholds.
 */
export function classifyHeatRiskFromPolicy(
  policy: HeatPolicy,
  wbgtF: number | null
): HeatRiskLevel | null {
  if (wbgtF == null) return null;

  const {
    wbgt_unit,
    low_max,
    moderate_min,
    moderate_max,
    high_min,
    high_max,
    extreme_min,
  } = policy;

  let value: number;

  if (wbgt_unit === "C") {
    value = ((wbgtF - 32) * 5) / 9;
  } else {
    // default to Fahrenheit thresholds
    value = wbgtF;
  }

  // If thresholds are not reasonably populated, bail out
  const anyThreshold =
    low_max != null ||
    moderate_min != null ||
    moderate_max != null ||
    high_min != null ||
    high_max != null ||
    extreme_min != null;

  if (!anyThreshold) {
    console.warn(
      "[practiceHeatRisk] Heat policy has no thresholds populated; cannot classify heat risk."
    );
    return null;
  }

  // Extreme: explicit lower bound
  if (extreme_min != null && value >= extreme_min) {
    return "extreme";
  }

  // High band
  if (
    high_min != null &&
    high_max != null &&
    value >= high_min &&
    value <= high_max
  ) {
    return "high";
  }

  // Moderate band
  if (
    moderate_min != null &&
    moderate_max != null &&
    value >= moderate_min &&
    value <= moderate_max
  ) {
    return "moderate";
  }

  // Low band (<= low_max)
  if (low_max != null && value <= low_max) {
    return "low";
  }

  // Fallback: if we got here, thresholds are incomplete or value is in a gap.
  console.warn(
    "[practiceHeatRisk] WBGT value did not cleanly fit into any threshold band; returning null.",
    { value, low_max, moderate_min, moderate_max, high_min, high_max, extreme_min }
  );
  return null;
}

/**
 * Central helper:
 *
 * - Looks up the appropriate heat policy for the team season (NFHS/NCAA/NAIA).
 * - Classifies heat risk for the given WBGT.
 * - Inserts a row into practice_weather_snapshots.
 * - Updates practice_plans with summary WBGT + heat_risk.
 *
 * This is where Tomorrow.io + NFHS/NCAA/NAIA policy meet the DB.
 */
export async function recordPracticeWeatherSnapshotAndUpdatePractice(
  args: RecordPracticeWeatherSnapshotArgs
): Promise<void> {
  const {
    practicePlanId,
    teamSeasonId,
    wbgtF,
    tempF = null,
    humidityPercent = null,
    windMph = null,
    weatherCode = null,
    weatherSummary = null,
    locationText = null,
    locationLat = null,
    locationLon = null,
    rawConditionsJson = null,
    source = "tomorrow_io",
  } = args;

  const supabase = await supabaseServerComponent();

  // 1) Load team_seasons row for governing_body context
  const { data: teamSeason, error: tsError } = await supabase
    .from("team_seasons")
    .select("id, governing_body")
    .eq("id", teamSeasonId)
    .single<TeamSeasonRow>();

  if (tsError || !teamSeason) {
    console.error(
      "[practiceHeatRisk] Failed to load team_seasons row when recording snapshot:",
      tsError || "not found"
    );
    return;
  }

  // 2) Get applicable heat policy (NFHS / NCAA / NAIA) for the team season
  const policy = await getHeatPolicyForTeamSeason({
    teamSeasonId,
    autoAttachToSeason: true,
  });

  let heatRisk: HeatRiskLevel | null = null;

  if (policy && wbgtF != null) {
    heatRisk = classifyHeatRiskFromPolicy(policy, wbgtF);
  }

  const wbgtC = fToC(wbgtF);
  const tempC = fToC(tempF);
  const windKph = mphToKph(windMph);

  // 3) Insert into practice_weather_snapshots for full history/audit
  const snapshotInsert = {
    practice_plan_id: practicePlanId,
    source,
    location_text: locationText,
    location_lat: locationLat,
    location_lon: locationLon,

    wbgt_f: wbgtF,
    wbgt_c: wbgtC,
    temp_f: tempF,
    temp_c: tempC,
    humidity_percent: humidityPercent,
    wind_mph: windMph,
    wind_kph: windKph,
    weather_code: weatherCode,
    weather_summary: weatherSummary,

    heat_risk: heatRisk,
    governing_body: policy?.governing_body ?? teamSeason.governing_body ?? null,
    heat_policy_id: policy?.id ?? null,

    conditions_json: rawConditionsJson ?? {},
  };

  const { error: snapshotError } = await supabase
    .from("practice_weather_snapshots")
    .insert([snapshotInsert]);

  if (snapshotError) {
    console.error(
      "[practiceHeatRisk] Failed to insert practice_weather_snapshots row:",
      snapshotError
    );
    // We still attempt to update practice_plans below; snapshot failure shouldn't block it.
  }

  // 4) Update practice_plans summary fields
  const practiceUpdate = {
    wbgt_f: wbgtF,
    wbgt_c: wbgtC,
    heat_risk: heatRisk,
  };

  const { error: practiceError } = await supabase
    .from("practice_plans")
    .update(practiceUpdate)
    .eq("id", practicePlanId);

  if (practiceError) {
    console.error(
      "[practiceHeatRisk] Failed to update practice_plans with WBGT summary:",
      practiceError
    );
  }
}

// --- Batch helper: refresh weekly heat risk for a team season ----------------

export type RefreshWeekHeatForSeasonArgs = {
  teamSeasonId: string;
  /**
   * ISO date string for the start of the week (YYYY-MM-DD),
   * typically the same startOfWeek used on the Practice page calendar.
   */
  weekStartIso: string;
  /**
   * Latitude/longitude used for Tomorrow.io forecast (program / campus location).
   */
  lat: number;
  lon: number;
};

/**
 * For a given team season and week:
 *  - Fetches a 7-day forecast (including wetBulbGlobeTemperature) from Tomorrow.io
 *  - Looks up all practice_plans for that team_season in the same date range
 *  - For each practice, maps the practice_date to its day's forecast
 *  - Calls recordPracticeWeatherSnapshotAndUpdatePractice to:
 *      * classify heat risk via policy
 *      * write practice_weather_snapshots
 *      * update practice_plans summary WBGT + heat_risk
 *
 * This is intentionally "dumb": it uses the daily wet-bulb value as a proxy for
 * practice-time WBGT. Later we can refine it to use hourly timelines per practice.
 */
export async function refreshWeekHeatForSeason(
  args: RefreshWeekHeatForSeasonArgs
): Promise<void> {
  const { teamSeasonId, weekStartIso, lat, lon } = args;

  const supabase = await supabaseServerComponent();

  // 1) Fetch 7-day forecast aligned to the same week as the calendar
  const weeklyWeather = await getWeeklyWeatherFromTomorrowIo({
    lat,
    lon,
    startDateIso: weekStartIso,
  });

  if (!weeklyWeather || weeklyWeather.length === 0) {
    console.warn(
      "[refreshWeekHeatForSeason] weeklyWeather returned no data; skipping heat refresh."
    );
    return;
  }

  const weatherByDate = new Map<string, (typeof weeklyWeather)[number]>();
  for (const day of weeklyWeather) {
    weatherByDate.set(day.dateIso, day);
  }

  // 2) Find all practices for this team season within that week
  const weekStart = new Date(weekStartIso);
  const weekEnd = new Date(
    weekStart.getFullYear(),
    weekStart.getMonth(),
    weekStart.getDate() + 6
  );
  const weekEndIso = weekEnd.toISOString().slice(0, 10);

  const { data: practices, error: practicesError } = await supabase
    .from("practice_plans")
    .select("id, team_season_id, practice_date")
    .eq("team_season_id", teamSeasonId)
    .gte("practice_date", weekStartIso)
    .lte("practice_date", weekEndIso);

  if (practicesError) {
    console.error(
      "[refreshWeekHeatForSeason] Failed to load practice_plans for week:",
      practicesError
    );
    return;
  }

  if (!practices || practices.length === 0) {
    // Nothing to do; no practices scheduled this week.
    return;
  }

  // 3) For each practice, map to the day's forecast and record a snapshot
  for (const practice of practices as { id: string; practice_date: string }[]) {
    const practiceDateIso =
      typeof practice.practice_date === "string"
        ? practice.practice_date.slice(0, 10)
        : new Date(practice.practice_date as any).toISOString().slice(0, 10);

    const dayWeather = weatherByDate.get(practiceDateIso);

    const wbgtF = dayWeather?.wetBulbF ?? null;
    const tempF =
      dayWeather?.tempMaxF != null
        ? dayWeather.tempMaxF
        : dayWeather?.tempMinF ?? null;
    const windMph = dayWeather?.windMph ?? null;
    const weatherCode = dayWeather?.weatherCode ?? null;
    const weatherSummary = dayWeather?.summary ?? null;

    try {
      await recordPracticeWeatherSnapshotAndUpdatePractice({
        practicePlanId: practice.id,
        teamSeasonId,
        wbgtF,
        tempF,
        humidityPercent: null,
        windMph,
        weatherCode,
        weatherSummary,
        // For now we pass the daily object as the raw JSON captured
        rawConditionsJson: dayWeather ?? null,
        source: "tomorrow_io",
      });
    } catch (err) {
      console.error(
        "[refreshWeekHeatForSeason] Failed to record heat snapshot for practice:",
        practice.id,
        err
      );
    }
  }
}