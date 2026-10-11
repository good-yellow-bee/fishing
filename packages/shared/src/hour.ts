import type { FishSpecies, Rarity } from "./types.ts";

export const LAKE_HOURS = ["dawn", "day", "dusk", "night"] as const;
export type LakeHour = (typeof LAKE_HOURS)[number];

export const LAKE_HOUR_LABELS: Record<LakeHour, string> = {
  dawn: "Dawn",
  day: "High sun",
  dusk: "Dusk",
  night: "Night",
};

export const LAKE_HOUR_BLURB: Record<LakeHour, string> = {
  dawn: "Trout work the shallows.",
  day: "Bright water. Commons cruise the dock.",
  dusk: "Bass, pike and walleye hunt the edges.",
  night: "Cats and burbot move in.",
};

export function isLakeHour(value: string): value is LakeHour {
  return (LAKE_HOURS as readonly string[]).includes(value);
}

export function lakeHour(at: Date = new Date()): LakeHour {
  const hour = at.getHours();
  if (hour >= 5 && hour < 8) return "dawn";
  if (hour >= 8 && hour < 17) return "day";
  if (hour >= 17 && hour < 21) return "dusk";
  return "night";
}

/** Clock hours where the lake hour turns over: dawn, day, dusk, night. */
export const LAKE_HOUR_STARTS = [5, 8, 17, 21] as const;

/** The next moment the lake hour changes after `at`, on the same local clock as lakeHour. */
export function nextLakeHourChange(at: Date): Date {
  for (const start of LAKE_HOUR_STARTS) {
    const turn = new Date(at.getFullYear(), at.getMonth(), at.getDate(), start, 0, 0, 0);
    if (turn > at) return turn;
  }
  return new Date(at.getFullYear(), at.getMonth(), at.getDate() + 1, LAKE_HOUR_STARTS[0], 0, 0, 0);
}

export function lakeHourFromSearch(search: string): LakeHour | null {
  const raw = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search).get("hour");
  return raw && isLakeHour(raw) ? raw : null;
}

const HOUR_RARITY: Record<LakeHour, Record<Rarity, number>> = {
  dawn: { common: 0.9, uncommon: 1.25, rare: 1.05, legendary: 1 },
  day: { common: 1, uncommon: 1, rare: 1, legendary: 1 },
  dusk: { common: 0.85, uncommon: 1.1, rare: 1.35, legendary: 1.1 },
  night: { common: 0.7, uncommon: 1.05, rare: 1.4, legendary: 1.15 },
};

const HOUR_SPECIES: Record<LakeHour, Record<string, number>> = {
  dawn: { "brook-trout": 1.8, "rainbow-trout": 1.8, perch: 1.4, salmon: 1.5, crappie: 1.8 },
  day: { "lake-whitefish": 1.4 },
  dusk: { "smallmouth-bass": 1.7, pike: 1.6, "tiger-muskie": 1.4, walleye: 1.8, "largemouth-bass": 1.5 },
  night: { catfish: 2.2, burbot: 2.2, carp: 1.6, pike: 1.3, walleye: 1.7, "ghost-pike": 1.8 },
};

export function biteHourMul(species: FishSpecies, hour: LakeHour): number {
  return HOUR_RARITY[hour][species.rarity] * (HOUR_SPECIES[hour][species.id] ?? 1);
}

export function lakeHourWaitMul(hour: LakeHour): number {
  if (hour === "dawn") return 0.88;
  if (hour === "night") return 1.18;
  if (hour === "dusk") return 0.95;
  return 1;
}
