import { spotById, type CatchEntry, type Logbook, type Measure } from "./logbook.ts";

export type SpeciesTally = {
  species: string;
  count: number;
  longest: CatchEntry | null;
  heaviest: CatchEntry | null;
  large: boolean;
};

export type WaterTally = {
  spotId: string;
  name: string;
  count: number;
};

export type PersonalBests = {
  longest: CatchEntry | null;
  heaviest: CatchEntry | null;
  species: SpeciesTally[];
  watersWithFish: number;
  waters: WaterTally[];
};

function amount(measure: Measure): number {
  return measure.kind === "length" ? measure.inches : measure.pounds;
}

function bestOf(catches: CatchEntry[], kind: Measure["kind"]): CatchEntry | null {
  let best: CatchEntry | null = null;
  for (const entry of catches) {
    if (entry.measure.kind !== kind) continue;
    if (!best || amount(entry.measure) > amount(best.measure)) best = entry;
  }
  return best;
}

export function personalBests(book: Logbook): PersonalBests {
  const longest = bestOf(book.catches, "length");
  const heaviest = bestOf(book.catches, "weight");
  const largeSpecies = new Set(
    [longest, heaviest].flatMap((entry) => (entry ? [entry.species] : [])),
  );

  const bySpecies = new Map<string, CatchEntry[]>();
  for (const entry of book.catches) {
    const rows = bySpecies.get(entry.species) ?? [];
    rows.push(entry);
    bySpecies.set(entry.species, rows);
  }

  const species = [...bySpecies.entries()]
    .map(([name, rows]) => ({
      species: name,
      count: rows.length,
      longest: bestOf(rows, "length"),
      heaviest: bestOf(rows, "weight"),
      large: largeSpecies.has(name),
    }))
    .sort((a, b) => b.count - a.count || a.species.localeCompare(b.species));

  const bySpot = new Map<string, number>();
  for (const entry of book.catches) {
    bySpot.set(entry.spotId, (bySpot.get(entry.spotId) ?? 0) + 1);
  }

  const waters = [...bySpot.entries()]
    .map(([spotId, count]) => ({
      spotId,
      name: spotById(book, spotId)?.name ?? "Unknown water",
      count,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return { longest, heaviest, species, watersWithFish: waters.length, waters };
}
