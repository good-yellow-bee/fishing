import type { Logbook } from "@stillwater/shared";

/** The heaviest weighed fish of a species in the field log, in pounds, or null before the first. The book names species by name. */
export function bestPounds(book: Logbook, species: string): number | null {
  let best: number | null = null;
  for (const entry of book.catches) {
    if (entry.species !== species || entry.measure.kind !== "weight") continue;
    if (best === null || entry.measure.pounds > best) best = entry.measure.pounds;
  }
  return best;
}
