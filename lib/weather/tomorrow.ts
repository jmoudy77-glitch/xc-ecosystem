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

  summary: string | null;
  heatRisk: HeatRiskLevel;
};

function classifyHeatRiskFromWetBulb(wetBulbC: number | null): HeatRiskLevel {
  if (wetBulbC == null) return "low";
  if (wetBulbC < 22) return "low";
  if (wetBulbC < 26) return "moderate";
  if (wetBulbC < 29) return "high";
  return "extreme";
}

/**
 * Placeholder implementation that returns a simple generated 7-day forecast
 * aligned to the provided ISO start date. This keeps the UI wiring clean
 * while we plug in the real Tomorrow.io API later.
 */
export async function getWeeklyWeatherFromTomorrowIo(args: {
  lat: number;
  lon: number;
  startDateIso: string; // Monday of the week (YYYY-MM-DD)
}): Promise<WeeklyWeatherDay[]> {
  const start = new Date(args.startDateIso);

  const days: WeeklyWeatherDay[] = Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() + idx
    );
    const dateIso = d.toISOString().slice(0, 10);

    // Dummy data: gentle gradient across the week
    const baseTemp = 24 + idx; // 24°C + day index
    const wetBulb = baseTemp - 3; // rough approximation

    const tempMaxC = baseTemp;
    const tempMinC = baseTemp - 5;
    const wetBulbC = wetBulb;
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
      summary: "Placeholder forecast",
      heatRisk: classifyHeatRiskFromWetBulb(wetBulbC),
    };
  });

  return days;
}