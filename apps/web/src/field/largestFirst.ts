import { measureOf, type CatchEntry } from "@stillwater/shared";

/**
 * The same fish, largest first: weighed fish by weight, then fish only measured, by length.
 * A pound and an inch don't compare, so weight leads, as a scale settles "biggest". Ties keep the order given.
 */
export function largestFirst(catches: CatchEntry[]): CatchEntry[] {
  const rank = (entry: CatchEntry): [number, number] => {
    const weight = measureOf(entry, "weight");
    if (weight?.kind === "weight") return [1, weight.pounds];
    const length = measureOf(entry, "length");
    return [0, length?.kind === "length" ? length.inches : 0];
  };
  return catches
    .map((entry, index) => ({ entry, index, rank: rank(entry) }))
    .sort((a, b) => b.rank[0] - a.rank[0] || b.rank[1] - a.rank[1] || a.index - b.index)
    .map(({ entry }) => entry);
}
