import { FISH, fishById } from "./fish.ts";
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

/** Letting a trophy-weight fish go pays this on top of the points it already earned. */
export const TROPHY_RELEASE_BONUS = 20;

export function isTrophyWeight(species: FishSpecies, weight: number): boolean {
  return weight >= trophyWeight(species);
}

/** Nest guarders: in spring they guard a nest in the shallows and fight hard for it. A bluegill fans its nest in the same shallows and chases off anything that comes near. */
export const NEST_GUARDERS: ReadonlySet<string> = new Set(["largemouth-bass", "smallmouth-bass", "bluegill"]);
/** The shallow spots where a nest guarder makes its nest. */
export const NEST_SPOTS: ReadonlySet<string> = new Set(["reeds", "dock"]);
/** Letting a nest guarder go back to its spring nest pays this on top, so the nest is not left to the egg thieves. */
export const NEST_RELEASE_BONUS = 15;

/** Whether a fish was hooked off its nest: a nest guarder in the shallows in spring. */
export function offItsNest(speciesId: string, spot: string, season: string | null | undefined): boolean {
  return season === "spring" && NEST_GUARDERS.has(speciesId) && NEST_SPOTS.has(spot);
}

/** Whether letting it go sends a guarder back to its nest: one off its nest and grown enough to hold one, past the middle of its kind's weights. */
export function backToItsNest(species: FishSpecies, weight: number, spot: string, season: string | null | undefined): boolean {
  return offItsNest(species.id, spot, season) && weight >= (species.minWeight + species.maxWeight) / 2;
}

/** What letting a fish go pays on top of its points: for a trophy, and for a guarder sent back to its nest. */
export function releaseBonus(species: FishSpecies, weight: number, spot: string, season: string | null | undefined): number {
  return (isTrophyWeight(species, weight) ? TROPHY_RELEASE_BONUS : 0) + (backToItsNest(species, weight, spot, season) ? NEST_RELEASE_BONUS : 0);
}

export type ShadowSize = "small" | "medium" | "large" | "huge";

export function shadowSize(species: FishSpecies): ShadowSize {
  if (species.maxWeight <= 1.5) return "small";
  if (species.maxWeight <= 5) return "medium";
  if (species.maxWeight <= 20) return "large";
  return "huge";
}
