export const SKIES = ["clear", "partly-cloudy", "overcast", "rain", "fog"] as const;

export type Sky = (typeof SKIES)[number];

export const SKY_LABELS: Record<Sky, string> = {
  clear: "Clear",
  "partly-cloudy": "Partly cloudy",
  overcast: "Overcast",
  rain: "Rain",
  fog: "Fog",
};

export const WINDS = [
  "calm",
  "light-north",
  "light-east",
  "light-south",
  "light-west",
  "breezy",
  "strong",
] as const;

export type Wind = (typeof WINDS)[number];

export const WIND_LABELS: Record<Wind, string> = {
  calm: "Calm",
  "light-north": "Light north",
  "light-east": "Light east",
  "light-south": "Light south",
  "light-west": "Light west",
  breezy: "Breezy",
  strong: "Strong",
};

export type CatchWeather = {
  sky: Sky;
  wind: Wind;
  waterTempF: number;
};

export type WeatherDraft = {
  sky: string;
  wind: string;
  waterTemp: string;
};

type WeatherError = { ok: false; field: string; message: string };
type WeatherParsed = { ok: true; value: CatchWeather } | WeatherError;

const SAMPLE_CATCH_WEATHER: Record<string, CatchWeather> = {
  "catch-brook-bugger": { sky: "overcast", wind: "light-north", waterTempF: 52 },
  "catch-brook-nymph": { sky: "overcast", wind: "light-north", waterTempF: 52 },
  "catch-pike-mepps": { sky: "overcast", wind: "light-west", waterTempF: 58 },
  "catch-pike-spin": { sky: "overcast", wind: "light-west", waterTempF: 58 },
  "catch-smallie-tube": { sky: "clear", wind: "breezy", waterTempF: 64 },
  "catch-smallie-crank": { sky: "clear", wind: "breezy", waterTempF: 64 },
  "catch-gill": { sky: "clear", wind: "calm", waterTempF: 68 },
  "catch-perch": { sky: "clear", wind: "calm", waterTempF: 68 },
  "catch-brook-caddis": { sky: "overcast", wind: "light-east", waterTempF: 48 },
  "catch-rainbow": { sky: "overcast", wind: "light-east", waterTempF: 48 },
};

function isSky(value: unknown): value is Sky {
  return typeof value === "string" && (SKIES as readonly string[]).includes(value);
}

function isWind(value: unknown): value is Wind {
  return typeof value === "string" && (WINDS as readonly string[]).includes(value);
}

export function isWeather(value: unknown): value is CatchWeather {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const weather = value as Record<string, unknown>;
  return (
    isSky(weather.sky) &&
    isWind(weather.wind) &&
    typeof weather.waterTempF === "number" &&
    Number.isFinite(weather.waterTempF)
  );
}

export function sampleCatchWeather(id: string): CatchWeather {
  const weather = SAMPLE_CATCH_WEATHER[id];
  if (!weather) throw new Error(`Missing sample weather for ${id}`);
  return weather;
}

function fail(field: string, message: string): WeatherError {
  return { ok: false, field, message };
}

function parseTemp(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
  const amount = Number(trimmed);
  return Number.isFinite(amount) ? amount : null;
}

export function parseWeatherDraft(draft: WeatherDraft): WeatherParsed {
  if (!isSky(draft.sky)) return fail("sky", "Note the sky.");
  if (!isWind(draft.wind)) return fail("wind", "Note the wind.");
  const waterTempF = parseTemp(draft.waterTemp);
  if (waterTempF === null) return fail("waterTemp", "Use a number for the water temperature.");
  if (waterTempF < 32 || waterTempF > 90) {
    return fail("waterTemp", "Water temperature should sit between 32 and 90.");
  }
  return { ok: true, value: { sky: draft.sky, wind: draft.wind, waterTempF } };
}

export function formatWeather(weather: CatchWeather): string {
  const temp = (Math.round(weather.waterTempF * 10) / 10).toString();
  return `${SKY_LABELS[weather.sky]} · ${WIND_LABELS[weather.wind]} · ${temp}°F`;
}

export function prepareStoredLogbook(value: unknown): unknown {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return value;
  const book = value as Record<string, unknown>;
  if (!Array.isArray(book.catches)) return value;
  return {
    ...book,
    catches: book.catches.map((entry) => {
      if (typeof entry !== "object" || entry === null || Array.isArray(entry)) return entry;
      const row = entry as Record<string, unknown>;
      if (isWeather(row.weather)) return row;
      const id = typeof row.id === "string" ? row.id : "";
      return { ...row, weather: SAMPLE_CATCH_WEATHER[id] ?? null };
    }),
  };
}
