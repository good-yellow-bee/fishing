import { catchesNewestFirst, type CatchEntry, type Logbook } from "@stillwater/shared";

/** The page for one kind of fish, by the name the book keeps it under. */
export function speciesLink(species: string) {
  return `/species/${encodeURIComponent(species)}`;
}

/** That kind's fish, newest first; the name matches whatever its case. */
export function catchesOfSpecies(book: Logbook, species: string): CatchEntry[] {
  const key = species.trim().toLowerCase();
  return catchesNewestFirst(book).filter((entry) => entry.species.trim().toLowerCase() === key);
}

/** The waters this kind came from, most fish first, then by name. */
export function speciesWaters(book: Logbook, catches: readonly CatchEntry[]) {
  const counts = new Map<string, number>();
  for (const entry of catches) counts.set(entry.spotId, (counts.get(entry.spotId) ?? 0) + 1);
  return [...counts]
    .map(([spotId, count]) => ({ spotId, name: book.spots.find((spot) => spot.id === spotId)?.name ?? null, count }))
    .sort((a, b) => b.count - a.count || (a.name ?? "").localeCompare(b.name ?? ""));
}
