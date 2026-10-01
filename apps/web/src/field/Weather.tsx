import { formatWeather, type CatchEntry, type CatchWeather } from "@stillwater/shared";

export function WeatherLine({ weather }: { weather: CatchWeather | null }) {
  if (!weather) return null;
  return <p className="weather-line">{formatWeather(weather)}</p>;
}

export function TripWeather({ catches }: { catches: CatchEntry[] }) {
  const lines = [...new Set(catches.flatMap((entry) => (entry.weather ? [formatWeather(entry.weather)] : [])))];
  if (lines.length === 0) return null;
  return (
    <aside className="conditions" aria-label="Weather on this outing">
      <span className="eyebrow">Weather</span>
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </aside>
  );
}
