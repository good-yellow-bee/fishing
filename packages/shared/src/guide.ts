import { FISH, fishById } from "./fish.ts";
import { LAKE_HOURS, biteHourMul, type LakeHour } from "./hour.ts";
import type { FishSpecies } from "./types.ts";

export type CatchStat = {
  speciesId: string;
  caught: number;
  heaviest: number;
  lastAt: string;
};

export type GuideEntry = {
  species: FishSpecies;
  caught: number;
  heaviest: number | null;
  lastAt: string | null;
};

export function fieldGuide(stats: CatchStat[]): GuideEntry[] {
  const byId = new Map(stats.map((row) => [row.speciesId, row]));
  return FISH.map((species) => {
    const row = byId.get(species.id);
    return {
      species,
      caught: row?.caught ?? 0,
      heaviest: row?.heaviest ?? null,
      lastAt: row?.lastAt ?? null,
    };
  });
}

export function guideProgress(entries: GuideEntry[]) {
  return {
    found: entries.filter((entry) => entry.caught > 0).length,
    total: entries.length,
  };
}

/** A trophy can also be a first or a personal best, so it rides on every kind. */
export type CatchStamp = (
  | { kind: "first" }
  | { kind: "pb"; previous: number }
  | { kind: "repeat"; heaviest: number }
) & { trophy: boolean };

export function catchStamp(stats: CatchStat[], speciesId: string, weight: number): CatchStamp {
  const species = fishById(speciesId);
  const trophy = species ? isTrophyWeight(species, weight) : false;
  const row = stats.find((entry) => entry.speciesId === speciesId);
  if (!row || row.caught === 0) return { kind: "first", trophy };
  if (weight > row.heaviest) return { kind: "pb", previous: row.heaviest, trophy };
  return { kind: "repeat", heaviest: row.heaviest, trophy };
}

/** Rounded up to rollWeight's 0.1 lb steps so small species stay near the top 15% too. */
export function trophyWeight(species: FishSpecies): number {
  const raw = species.minWeight + (species.maxWeight - species.minWeight) * 0.85;
  // Float noise such as 15.900000000000002 must not bump the threshold a whole step.
  return Math.ceil(raw * 10 - 1e-9) / 10;
}

export function isTrophyWeight(species: FishSpecies, weight: number): boolean {
  return weight >= trophyWeight(species);
}

export type ShadowSize = "small" | "medium" | "large" | "huge";

export function shadowSize(species: FishSpecies): ShadowSize {
  if (species.maxWeight <= 1.5) return "small";
  if (species.maxWeight <= 5) return "medium";
  if (species.maxWeight <= 20) return "large";
  return "huge";
}

export type GuideClue = {
  spots: FishSpecies["spots"];
  bestHour: LakeHour;
  shadow: ShadowSize;
};

export function guideClue(species: FishSpecies): GuideClue {
  let bestHour: LakeHour = LAKE_HOURS[0];
  for (const hour of LAKE_HOURS.slice(1)) {
    if (biteHourMul(species, hour) > biteHourMul(species, bestHour)) bestHour = hour;
  }
  return { spots: species.spots, bestHour, shadow: shadowSize(species) };
}
