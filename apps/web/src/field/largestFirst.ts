import { likelyWeight, measureOf, sizePairs, type CatchEntry, type SizePair } from "@stillwater/shared";
import { kindKey } from "./speciesLink";

/** About a pound for a 14-inch fish: the weight a length suggests when the kind has no weighed and measured pairs to go by. */
const ROUGH_FACTOR = 1 / 2700;

/**
 * The same fish, largest first, on one scale: a weighed fish by its weight, a fish only measured by the weight its
 * length suggests (from its kind's own measured-and-weighed fish where there are two, else roughly), so a 0.4 lb trout
 * doesn't lead a 28-inch pike. Ties keep the order given.
 */
export function largestFirst(catches: CatchEntry[]): CatchEntry[] {
  const pairsOf = new Map<string, SizePair[]>();
  const pairs = (entry: CatchEntry) => {
    const key = kindKey(entry.species);
    let found = pairsOf.get(key);
    if (!found) pairsOf.set(key, (found = sizePairs(catches.filter((other) => kindKey(other.species) === key))));
    return found;
  };
  const rank = (entry: CatchEntry): number => {
    const weight = measureOf(entry, "weight");
    if (weight?.kind === "weight") return weight.pounds;
    const length = measureOf(entry, "length");
    if (length?.kind !== "length" || !(length.inches > 0)) return 0;
    return likelyWeight(pairs(entry), length.inches) ?? length.inches ** 3 * ROUGH_FACTOR;
  };
  return catches
    .map((entry, index) => ({ entry, index, rank: rank(entry) }))
    .sort((a, b) => b.rank - a.rank || a.index - b.index)
    .map(({ entry }) => entry);
}
