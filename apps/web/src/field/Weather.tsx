import type { CatchEntry, CatchWeather } from "@stillwater/shared";
import { useT } from "../i18n";
import { weatherText } from "../i18n/content";

export function WeatherLine({ weather }: { weather: CatchWeather | null }) {
  useT();
  if (!weather) return null;
  return <p className="weather-line">{weatherText(weather)}</p>;
}

export function TripWeather({ catches }: { catches: CatchEntry[] }) {
  const t = useT();
  const lines = [...new Set(catches.flatMap((entry) => (entry.weather ? [weatherText(entry.weather)] : [])))];
  if (lines.length === 0) return null;
  return (
    <aside className="conditions" aria-label={t("Weather on this outing")}>
      <span className="eyebrow">{t("Weather")}</span>
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </aside>
  );
}
