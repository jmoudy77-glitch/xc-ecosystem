// lib/weather/tomorrow.ts
// Client for Tomorrow.io weather data, returning a 7-day aligned forecast
// with wet-bulb temperature and a simple heat-risk classification.

export type HeatRiskLevel = "low" | "moderate" | "high" | "extreme";

export type WeeklyWeatherDay = {
  dateIso: string; // YYYY-MM-DD

  // Temperatures in Celsius (internal / classification)
  tempMaxC: number | null;
  tempMinC: number | null;
  wetBulbC: number | null;

  // Temperatures in Fahrenheit (for UI display)
  tempMaxF: number | null;
  tempMinF: number | null;
  wetBulbF: number | null;

  // Wind in kph (raw) and mph (for UI display)
  windKph: number | null;
  windMph: number | null;

  // Tomorrow.io weather code + derived text description
  weatherCode: number | null;
  summary: string | null;

  heatRisk: HeatRiskLevel;
};

function describeWeatherCode(code: number | null): string | null {
  if (code == null) return null;

  // Mapping based on Tomorrow.io weather code families (simplified).
  // We can refine this over time as needed.
  if (code === 0 || code === 1000) return "Clear";
  if (code === 1001) return "Cloudy";
  if (code === 1100) return "Mostly clear";
  if (code === 1101) return "Partly cloudy";
  if (code === 1102) return "Mostly cloudy";
  if (code >= 2000 && code < 3000) return "Foggy";
  if (code >= 4000 && code < 5000) return "Drizzle";
  if (code >= 5000 && code < 6000) return "Rain";
  if (code >= 6000 && code < 7000) return "Freezing rain or sleet";
  if (code >= 7000 && code < 8000) return "Snow";
  if (code >= 8000 && code < 9000) return "Thunderstorm";

  return "Mixed conditions";
}

function fToC(f: number | null): number | null {
  if (f == null) return null;
  return ((f - 32) * 5) / 9;
}

function mphToKph(mph: number | null): number | null {
  if (mph == null) return null;
  return mph / 0.621371;
}

function estimateWetBulbC(
  tempC: number | null,
  humidityPercent: number | null
): number | null {
  if (tempC == null || humidityPercent == null) return null;

  // Stull (2011) approximation for wet-bulb temperature in °C.
  const rh = humidityPercent;
  const t = tempC;

  const tw =
    t * Math.atan(0.151977 * Math.sqrt(rh + 8.313659)) +
    Math.atan(t + rh) -
    Math.atan(rh - 1.676331) +
    0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh) -
    4.686035;

  return tw;
}

function classifyHeatRiskFromWetBulb(wetBulbC: number | null): HeatRiskLevel {
  if (wetBulbC == null) return "low";
  if (wetBulbC < 22) return "low";
  if (wetBulbC < 26) return "moderate";
  if (wetBulbC < 29) return "high";
  return "extreme";
}

/**
 * Fetch a 7-day aligned forecast from Tomorrow.io's /v4/weather/forecast API.
 *
 * - Uses daily timelines
 * - Requests imperial units (°F, mph) and converts to C/kph as needed
 * - Includes wet-bulb / WBGT when available
 * - Falls back to deterministic placeholder data if the API key is missing or the call fails
 */
export async function getWeeklyWeatherFromTomorrowIo(args: {
  lat: number;
  lon: number;
  startDateIso: string; // Monday of the week (YYYY-MM-DD)
}): Promise<WeeklyWeatherDay[]> {
  const { lat, lon, startDateIso } = args;
  const start = new Date(startDateIso);

  const apiKey = process.env.TOMORROW_API_KEY;

  // If no API key, keep using the existing placeholder behavior
  if (!apiKey) {
    console.warn(
      "[Tomorrow] TOMORROW_API_KEY is not set; using placeholder weekly weather."
    );

    const days: WeeklyWeatherDay[] = Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate() + idx
      );
      const dateIso = d.toISOString().slice(0, 10);

      const baseTempC = 24 + idx;
      const tempMaxC = baseTempC;
      const tempMinC = baseTempC - 5;
      const wetBulbC = baseTempC - 3;
      const windKph = 10 + idx;

      const tempMaxF = tempMaxC != null ? tempMaxC * (9 / 5) + 32 : null;
      const tempMinF = tempMinC != null ? tempMinC * (9 / 5) + 32 : null;
      const wetBulbF = wetBulbC != null ? wetBulbC * (9 / 5) + 32 : null;
      const windMph = windKph != null ? windKph * 0.621371 : null;

      return {
        dateIso,
        tempMaxC,
        tempMinC,
        wetBulbC,
        tempMaxF,
        tempMinF,
        wetBulbF,
        windKph,
        windMph,
        weatherCode: null,
        summary: "Placeholder forecast",
        heatRisk: classifyHeatRiskFromWetBulb(wetBulbC),
      };
    });

    return days;
  }

  try {
    const params = new URLSearchParams({
      location: `${lat},${lon}`,
      timesteps: "daily",
      units: "imperial",
      apikey: apiKey,
      fields: [
        "temperatureMax",
        "temperatureMin",
        "humidity",
        "windSpeed",
        "weatherCode",
      ].join(","),
    });

    const url = `https://api.tomorrow.io/v4/weather/forecast?${params.toString()}`;

    const res = await fetch(url);
    if (!res.ok) {
      console.error(
        "[Tomorrow] Forecast request failed:",
        res.status,
        res.statusText
      );
      throw new Error(`Tomorrow.io forecast failed: ${res.status}`);
    }

    const json: any = await res.json();
    const daily = json?.timelines?.daily ?? [];

    if (!Array.isArray(daily) || daily.length === 0) {
      console.warn(
        "[Tomorrow] No daily forecast data returned; falling back to placeholders."
      );
      throw new Error("No daily forecast data");
    }

    const dailyArray: any[] = Array.isArray(daily) ? daily : [];

    // Map forecast into our WeeklyWeatherDay shape, aligned to the 7-day calendar window.
    const days: WeeklyWeatherDay[] = Array.from({ length: 7 }).map((_, idx) => {
      const current = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate() + idx
      );
      const targetIso = current.toISOString().slice(0, 10);

      // Prefer exact date match first
      let match = dailyArray.find((entry: any) => {
        const time = entry?.time ?? entry?.startTime;
        if (!time || typeof time !== "string") return false;
        return time.slice(0, 10) === targetIso;
      });

      // If we didn't find an exact match (time zone offsets, forecast window, etc.),
      // fall back to using the entry at the same index, or the last available entry.
      if (!match) {
        match = dailyArray[idx] ?? dailyArray[dailyArray.length - 1] ?? null;
      }

      const values = match?.values ?? {};

      const humidityPercent =
        typeof values.humidity === "number"
          ? values.humidity
          : typeof values.humidityAvg === "number"
          ? values.humidityAvg
          : typeof values.humidityMin === "number"
          ? values.humidityMin
          : typeof values.humidityMax === "number"
          ? values.humidityMax
          : null;

      const windMph =
        typeof values.windSpeed === "number"
          ? values.windSpeed
          : typeof values.windSpeedAvg === "number"
          ? values.windSpeedAvg
          : typeof values.windGust === "number"
          ? values.windGust
          : null;

      const weatherCode =
        typeof values.weatherCode === "number"
          ? values.weatherCode
          : typeof values.weatherCodeFullDay === "number"
          ? values.weatherCodeFullDay
          : null;

      const tempMaxF =
        typeof values.temperatureMax === "number"
          ? values.temperatureMax
          : typeof values.temperature === "number"
          ? values.temperature
          : null;

      const tempMinF =
        typeof values.temperatureMin === "number"
          ? values.temperatureMin
          : typeof values.temperature === "number"
          ? values.temperature
          : null;

      const tempMaxC = fToC(tempMaxF);
      const tempMinC = fToC(tempMinF);

      // Use the average of min/max when both are available, otherwise whichever we have.
      let baseTempC: number | null = null;
      if (tempMaxF != null && tempMinF != null) {
        baseTempC = fToC((tempMaxF + tempMinF) / 2);
      } else if (tempMaxF != null) {
        baseTempC = fToC(tempMaxF);
      } else if (tempMinF != null) {
        baseTempC = fToC(tempMinF);
      }

      const wetBulbC = estimateWetBulbC(baseTempC, humidityPercent);
      const wbgtF = wetBulbC != null ? wetBulbC * (9 / 5) + 32 : null;

      const windKph = mphToKph(windMph);

      const summary = describeWeatherCode(weatherCode);
      const heatRisk = classifyHeatRiskFromWetBulb(wetBulbC);

      return {
        dateIso: targetIso,
        tempMaxC,
        tempMinC,
        wetBulbC,
        tempMaxF,
        tempMinF,
        wetBulbF: wbgtF,
        windKph,
        windMph,
        weatherCode,
        summary,
        heatRisk,
      };
    });

    return days;
  } catch (err) {
    console.error("[Tomorrow] Error fetching or parsing forecast:", err);

    // Fallback: deterministic placeholder data so the UI still renders.
    const fallback: WeeklyWeatherDay[] = Array.from({ length: 7 }).map(
      (_, idx) => {
        const d = new Date(
          start.getFullYear(),
          start.getMonth(),
          start.getDate() + idx
        );
        const dateIso = d.toISOString().slice(0, 10);

        const baseTempC = 24 + idx;
        const tempMaxC = baseTempC;
        const tempMinC = baseTempC - 5;
        const wetBulbC = baseTempC - 3;
        const windKph = 10 + idx;

        const tempMaxF = tempMaxC != null ? tempMaxC * (9 / 5) + 32 : null;
        const tempMinF = tempMinC != null ? tempMinC * (9 / 5) + 32 : null;
        const wetBulbF = wetBulbC != null ? wetBulbC * (9 / 5) + 32 : null;
        const windMph = windKph != null ? windKph * 0.621371 : null;

        return {
          dateIso,
          tempMaxC,
          tempMinC,
          wetBulbC,
          tempMaxF,
          tempMinF,
          wetBulbF,
          windKph,
          windMph,
          weatherCode: null,
          summary: "Placeholder forecast",
          heatRisk: classifyHeatRiskFromWetBulb(wetBulbC),
        };
      }
    );

    return fallback;
  }
}