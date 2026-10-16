import { measureOf, type Logbook } from "@stillwater/shared";

/** The heaviest weighed fish of a species in the field log, in pounds, or null before the first. The book names species by name. */
export function bestPounds(book: Logbook, species: string): number | null {
  let best: number | null = null;
  for (const entry of book.catches) {
    const weight = entry.species === species ? measureOf(entry, "weight") : null;
    if (weight?.kind !== "weight") continue;
    if (best === null || weight.pounds > best) best = weight.pounds;
  }
  return best;
}
