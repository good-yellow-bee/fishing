import { catchesNewestFirst, type CatchEntry, type Logbook } from "@stillwater/shared";
import { offPlayLake } from "./playLake";

/** The page for one kind of fish, by the name the book keeps it under. */
export function speciesLink(species: string) {
  return `/species/${encodeURIComponent(species)}`;
}

/** That kind's fish, newest first; the name matches whatever its case. */
export function catchesOfSpecies(book: Logbook, species: string): CatchEntry[] {
  const key = species.trim().toLowerCase();
  return catchesNewestFirst(book).filter((entry) => entry.species.trim().toLowerCase() === key);
}

/**
 * The fish a kind's page lists, newest first: the angler's own, leaving the game's out; a kind only ever caught in the
 * game shows its game fish. Every count that opens the kind's page goes by this.
 */
export function kindOnPage(book: Logbook, species: string): CatchEntry[] {
  const every = catchesOfSpecies(book, species);
  const own = every.filter(offPlayLake);
  return own.length > 0 ? own : every;
}

/** Each kind among `catches` counted as its page counts it: the angler's own fish, or its game fish when that is all. */
export function pageCounts(catches: readonly CatchEntry[]) {
  const own = speciesCounts(catches.filter(offPlayLake));
  const known = new Set(own.map((row) => row.species.trim().toLowerCase()));
  const gameOnly = speciesCounts(catches.filter((entry) => !offPlayLake(entry))).filter((row) => !known.has(row.species.trim().toLowerCase()));
  return [...own, ...gameOnly].sort((a, b) => b.count - a.count || a.species.localeCompare(b.species));
}

/** The waters this kind came from, most fish first, then by name. */
export function speciesWaters(book: Logbook, catches: readonly CatchEntry[]) {
  const counts = new Map<string, number>();
  for (const entry of catches) counts.set(entry.spotId, (counts.get(entry.spotId) ?? 0) + 1);
  return [...counts]
    .map(([spotId, count]) => ({ spotId, name: book.spots.find((spot) => spot.id === spotId)?.name ?? null, count }))
    .sort((a, b) => b.count - a.count || (a.name ?? "").localeCompare(b.name ?? ""));
}

/** The kinds among some fish, most first, then by name, keeping the book's name for each. */
export function speciesCounts(catches: readonly CatchEntry[]) {
  const counts = new Map<string, { species: string; count: number }>();
  for (const entry of catches) {
    const key = entry.species.trim().toLowerCase();
    const row = counts.get(key) ?? { species: entry.species, count: 0 };
    row.count += 1;
    counts.set(key, row);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.species.localeCompare(b.species));
}
