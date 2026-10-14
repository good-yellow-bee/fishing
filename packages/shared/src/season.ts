import type { FishSpecies, Rarity } from "./types.ts";

export const LAKE_SEASONS = ["spring", "summer", "fall", "winter"] as const;

export type LakeSeason = (typeof LAKE_SEASONS)[number];

export const SEASON_LABELS: Record<LakeSeason, string> = {
  spring: "Spring",
  summer: "Summer",
  fall: "Fall",
  winter: "Winter",
};

export const SEASON_BLURB: Record<LakeSeason, string> = {
  spring: "Ice out. Trout and crappie crowd the shallows.",
  summer: "Warm water. Bass, carp and catfish feed hard.",
  fall: "Salmon run. Walleye and pike fatten up.",
  winter: "Ice at the edges. Burbot and whitefish stir.",
};

export function isLakeSeason(value: unknown): value is LakeSeason {
  return typeof value === "string" && (LAKE_SEASONS as readonly string[]).includes(value);
}

/**
 * A northern lake's season by the local calendar month, on the same clock as
 * lakeHour: March to May spring, June to August summer, September to November
 * fall, December to February winter. Seasons only lean the odds, so no fish is
 * ever locked away for months.
 */
export function lakeSeason(date: Date = new Date()): LakeSeason {
  const month = date.getMonth();
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "fall";
  return "winter";
}

/** `?season=` pins the season for testing, like `?hour=` and `?sky=`. */
export function seasonFromSearch(search: string): LakeSeason | null {
  const raw = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search).get("season");
  return isLakeSeason(raw) ? raw : null;
}

const SEASON_RARITY: Record<LakeSeason, Record<Rarity, number>> = {
  spring: { common: 1, uncommon: 1.1, rare: 1, legendary: 1 },
  summer: { common: 1.1, uncommon: 1, rare: 0.95, legendary: 1 },
  fall: { common: 0.95, uncommon: 1.05, rare: 1.15, legendary: 1.1 },
  winter: { common: 0.9, uncommon: 1, rare: 1.2, legendary: 1.2 },
};

/** Who runs, spawns or sulks in each season. Under 1 means the fish is sluggish then, never gone. */
export const SEASON_SPECIES: Record<LakeSeason, Record<string, number>> = {
  spring: { "brook-trout": 1.5, "rainbow-trout": 1.5, crappie: 1.6, perch: 1.3 },
  summer: { carp: 1.5, "largemouth-bass": 1.5, "smallmouth-bass": 1.4, bluegill: 1.4, catfish: 1.3 },
  fall: { salmon: 2, walleye: 1.4, pike: 1.3, "tiger-muskie": 1.4 },
  winter: { burbot: 2, "lake-whitefish": 1.6, perch: 1.3, pike: 1.2, carp: 0.6, "largemouth-bass": 0.7, catfish: 0.7 },
};

export function biteSeasonMul(species: FishSpecies, season: LakeSeason): number {
  return SEASON_RARITY[season][species.rarity] * (SEASON_SPECIES[season][species.id] ?? 1);
}

/** The season a species runs in, for the field guide; null when no season stands out for it. */
export function peakSeason(speciesId: string): LakeSeason | null {
  let best: LakeSeason | null = null;
  let top = 1.25;
  for (const season of LAKE_SEASONS) {
    const boost = SEASON_SPECIES[season][speciesId] ?? 1;
    if (boost > top) {
      best = season;
      top = boost;
    }
  }
  return best;
}
