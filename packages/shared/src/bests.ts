import { LAKE_SEASONS, SEASON_LABELS, lakeSeason, type LakeSeason } from "./season.ts";
import { formatMeasure, spotById, type CatchEntry, type Logbook, type Measure } from "./logbook.ts";

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

export type FieldLogBestBeat = {
  scope: "book" | "species";
  previousPounds: number;
  previousSpecies: string;
  line: string;
};

function weightBest(entry: CatchEntry | null): { pounds: number; species: string } | null {
  if (!entry || entry.measure.kind !== "weight") return null;
  return { pounds: entry.measure.pounds, species: entry.species };
}

function beatLine(scope: FieldLogBestBeat["scope"], pounds: number, species: string): string {
  const size = formatMeasure({ kind: "weight", pounds });
  if (scope === "book") return `Beats the ${size} ${species} already in the field log`;
  return `Beats your ${size} ${species} already in the field log`;
}

export function fieldLogBestBeat(
  book: Logbook,
  species: string,
  pounds: number,
  ignoreId?: string,
): FieldLogBestBeat | null {
  const prior = ignoreId ? { ...book, catches: book.catches.filter((entry) => entry.id !== ignoreId) } : book;
  const bests = personalBests(prior);
  const bookBest = weightBest(bests.heaviest);
  if (bookBest && pounds > bookBest.pounds) {
    return {
      scope: "book",
      previousPounds: bookBest.pounds,
      previousSpecies: bookBest.species,
      line: beatLine("book", bookBest.pounds, bookBest.species),
    };
  }
  const speciesBest = weightBest(bests.species.find((row) => row.species === species)?.heaviest ?? null);
  if (speciesBest && pounds > speciesBest.pounds) {
    return {
      scope: "species",
      previousPounds: speciesBest.pounds,
      previousSpecies: speciesBest.species,
      line: beatLine("species", speciesBest.pounds, speciesBest.species),
    };
  }
  return null;
}

/** Parts of the day an angler talks about, by local clock hour they start at; night wraps past midnight. */
export const BITE_TIMES = [
  { id: "dawn", label: "Dawn", from: 4 },
  { id: "morning", label: "Morning", from: 8 },
  { id: "midday", label: "Midday", from: 11 },
  { id: "afternoon", label: "Afternoon", from: 15 },
  { id: "evening", label: "Evening", from: 18 },
  { id: "night", label: "Night", from: 21 },
] as const;

export type BiteTime = { id: (typeof BITE_TIMES)[number]["id"]; label: string; count: number };

export function biteTimeOf(hour: number): (typeof BITE_TIMES)[number]["id"] {
  let found: (typeof BITE_TIMES)[number] = BITE_TIMES[BITE_TIMES.length - 1]!;
  for (const band of BITE_TIMES) if (hour >= band.from) found = band;
  return found.id;
}

/** How many fish came at each part of the day, by the clock where the book is read. Always all six, in order. */
export function biteTimes(book: Logbook): BiteTime[] {
  const counts = new Map<string, number>();
  for (const entry of book.catches) {
    const at = new Date(entry.caughtAt);
    if (Number.isNaN(at.getTime())) continue;
    const id = biteTimeOf(at.getHours());
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return BITE_TIMES.map((band) => ({ id: band.id, label: band.label, count: counts.get(band.id) ?? 0 }));
}

export type LureTally = { lure: string; count: number };

/** The lures that took the most fish, most first; spelling and case don't split a lure in two. */
export function lureTally(book: Logbook, limit = 5): LureTally[] {
  const tallies = new Map<string, LureTally>();
  for (const entry of book.catches) {
    const name = entry.lure.trim().replace(/\s+/g, " ");
    if (!name) continue;
    const key = name.toLowerCase();
    const row = tallies.get(key);
    if (row) row.count += 1;
    else tallies.set(key, { lure: name, count: 1 });
  }
  return [...tallies.values()].sort((a, b) => b.count - a.count || a.lure.localeCompare(b.lure)).slice(0, limit);
}

export type SeasonTally = { id: LakeSeason; label: string; count: number };

/** How many fish came in each season, by the calendar month where the book is read. Always all four, spring first. */
export function seasonTally(book: Logbook): SeasonTally[] {
  const counts = new Map<LakeSeason, number>();
  for (const entry of book.catches) {
    const at = new Date(entry.caughtAt);
    if (Number.isNaN(at.getTime())) continue;
    const season = lakeSeason(at);
    counts.set(season, (counts.get(season) ?? 0) + 1);
  }
  return LAKE_SEASONS.map((id) => ({ id, label: SEASON_LABELS[id], count: counts.get(id) ?? 0 }));
}

export type BestDay = { date: string; count: number };

function localYmd(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The local day with the most fish in the book; a tie goes to the latest day. Null for an empty book. */
export function bestDay(book: Logbook): BestDay | null {
  const counts = new Map<string, number>();
  for (const entry of book.catches) {
    const at = new Date(entry.caughtAt);
    if (Number.isNaN(at.getTime())) continue;
    const day = localYmd(at);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  let best: BestDay | null = null;
  for (const [date, count] of counts) {
    if (!best || count > best.count || (count === best.count && date > best.date)) best = { date, count };
  }
  return best;
}
