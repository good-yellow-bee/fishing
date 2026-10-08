export const SKIES = ["clear", "partly-cloudy", "overcast", "rain", "fog"] as const;

export type Sky = (typeof SKIES)[number];

const DAILY_SKIES = ["clear", "overcast", "rain", "fog"] as const satisfies readonly Sky[];

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

/** The same UTC calendar day always has the same lake weather for every player. */
export function weatherForDay(date: Date = new Date()): Sky {
  const key = `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}`;
  let hash = 2166136261;
  for (const char of key) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return DAILY_SKIES[(hash >>> 0) % DAILY_SKIES.length]!;
}

/** A local visual preview override. Server rewards must use issued daily weather. */
export function weatherFromSearch(search: string): Sky | null {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const value = params.get("weather") ?? params.get("sky");
  return value && isSky(value) ? value : null;
}

const WEATHER_RARITY: Record<Sky, Record<import("./types.ts").Rarity, number>> = {
  clear: { common: 1.1, uncommon: 1, rare: 0.9, legendary: 0.9 },
  "partly-cloudy": { common: 1, uncommon: 1, rare: 1, legendary: 1 },
  overcast: { common: 0.95, uncommon: 1.1, rare: 1.1, legendary: 1.1 },
  rain: { common: 0.9, uncommon: 1.15, rare: 1.2, legendary: 1.2 },
  fog: { common: 0.9, uncommon: 1.05, rare: 1.25, legendary: 1.3 },
};

const WEATHER_SPECIES: Partial<Record<Sky, Record<string, number>>> = {
  overcast: { "brook-trout": 1.35, "rainbow-trout": 1.35 },
  rain: { pike: 1.7, "tiger-muskie": 1.35 },
  fog: { catfish: 1.45, burbot: 1.45 },
};

export function biteWeatherMul(species: import("./types.ts").FishSpecies, sky: Sky): number {
  return WEATHER_RARITY[sky][species.rarity] * (WEATHER_SPECIES[sky]?.[species.id] ?? 1);
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
