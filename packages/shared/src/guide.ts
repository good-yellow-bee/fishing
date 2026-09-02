import { FISH } from "./fish.ts";
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

export type CatchStamp =
  | { kind: "first" }
  | { kind: "pb"; previous: number }
  | { kind: "repeat"; heaviest: number };

export function catchStamp(stats: CatchStat[], speciesId: string, weight: number): CatchStamp {
  const row = stats.find((entry) => entry.speciesId === speciesId);
  if (!row || row.caught === 0) return { kind: "first" };
  if (weight > row.heaviest) return { kind: "pb", previous: row.heaviest };
  return { kind: "repeat", heaviest: row.heaviest };
}
