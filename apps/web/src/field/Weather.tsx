import type { CatchEntry, CatchWeather } from "@stillwater/shared";
import { useT } from "../i18n";
import { weatherText } from "../i18n/content";
import { fishCountLabel, formatTimeOfDay } from "./format";

export function WeatherLine({ weather }: { weather: CatchWeather | null }) {
  useT();
  if (!weather) return null;
  return <p className="weather-line">{weatherText(weather)}</p>;
}

export type WeatherRun = { from: string; weather: CatchWeather; fish: number };

/**
 * An outing's weather as it came, oldest first: a new run each time the sky or the wind changed, starting at that
 * fish's time and counting the fish caught in it. A fish with no weather noted joins the run it fell in (the first
 * run, before any was noted); a run's temperature is the first one noted in it.
 */
export function weatherRuns(catches: readonly CatchEntry[]): WeatherRun[] {
  const runs: WeatherRun[] = [];
  let before = 0;
  for (const entry of [...catches].sort((a, b) => a.caughtAt.localeCompare(b.caughtAt))) {
    const last = runs[runs.length - 1];
    const weather = entry.weather;
    if (weather && (!last || last.weather.sky !== weather.sky || last.weather.wind !== weather.wind)) {
      runs.push({ from: entry.caughtAt, weather, fish: 1 + (last ? 0 : before) });
      continue;
    }
    if (!last) {
      before += 1;
      continue;
    }
    last.fish += 1;
    if (weather?.waterTempF !== undefined && last.weather.waterTempF === undefined) last.weather = { ...last.weather, waterTempF: weather.waterTempF };
  }
  return runs;
}

export function TripWeather({ catches }: { catches: CatchEntry[] }) {
  const t = useT();
  const runs = weatherRuns(catches);
  if (runs.length === 0) return null;
  return (
    <aside className="conditions" aria-label={t("Weather on this outing")}>
      <span className="eyebrow">{t("Weather")}</span>
      {runs.length === 1 ? (
        <p>{weatherText(runs[0]!.weather)}</p>
      ) : (
        // When it changed, what it was, and the fish it brought.
        runs.map((run, index) => (
          <p key={index}>
            <time className="run-time" dateTime={run.from}>{formatTimeOfDay(run.from)}</time> {weatherText(run.weather)} · {fishCountLabel(run.fish)}
          </p>
        ))
      )}
    </aside>
  );
}
