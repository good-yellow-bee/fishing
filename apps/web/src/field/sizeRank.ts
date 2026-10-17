import { likelyWeight, measureOf, sizePairs, type CatchEntry, type Measure } from "@stillwater/shared";
import { getUnits, t } from "../i18n";
import { CM_PER_IN, KG_PER_LB } from "../i18n/content";

/**
 * A size as it reads, in real units: 23.9 in and 24.0 in are both 61 cm to a metric reader, so neither is bigger.
 * Weights under one read to the hundredth, the rest to the tenth.
 */
function shownSize(measure: Measure): number {
  const metric = getUnits() === "metric";
  const value = measure.kind === "length" ? (metric ? measure.inches * CM_PER_IN : measure.inches) : metric ? measure.pounds * KG_PER_LB : measure.pounds;
  const places = measure.kind === "length" ? (metric ? 0 : 1) : value < 1 ? 2 : 1;
  return Math.round(value * 10 ** places) / 10 ** places;
}

/**
 * Where a fish sits among the others of its kind measured the same way: "Longer than 7 of the 9 others of its kind".
 * Null with fewer than three others to weigh it against, or when it beats none of them.
 */
export function sizeRank(kind: readonly CatchEntry[], entry: CatchEntry): string | null {
  const own = entry.measure;
  const others = kind.flatMap((other) => {
    if (other.id === entry.id) return [];
    const theirs = measureOf(other, own.kind);
    return theirs ? [shownSize(theirs)] : [];
  });
  if (others.length < 3) return null;
  // As the sizes read: two that show the same are neither longer nor heavier.
  const beaten = others.filter((value) => value < shownSize(own)).length;
  if (beaten === 0) return null;
  const vars = { count: beaten, total: others.length };
  return own.kind === "length" ? t("Longer than {count} of the {total} others of its kind", vars) : t("Heavier than {count} of the {total} others of its kind", vars);
}

/**
 * The fish this one is the biggest since: the newest earlier fish of its kind at least as big, once three or more
 * of the kind came in between, all smaller. Null when nothing earlier was as big (a best at the time) or the gap is short.
 */
export function biggestSince(kind: readonly CatchEntry[], entry: CatchEntry): CatchEntry | null {

  const own = shownSize(entry.measure);
  const at = Date.parse(entry.caughtAt);
  const earlier = kind
    .filter((other) => other.id !== entry.id && Date.parse(other.caughtAt) < at)
    .sort((a, b) => Date.parse(b.caughtAt) - Date.parse(a.caughtAt));
  let between = 0;
  for (const other of earlier) {
    const theirs = measureOf(other, entry.measure.kind);
    if (theirs && shownSize(theirs) >= own) return between >= 3 ? other : null;
    if (theirs) between += 1;
  }
  return null;
}

/**
 * For a fish both measured and weighed: whether it was well heavier or lighter than its length would say, going by the
 * other fish of its kind that were both measured and weighed (three at least), and the weight that would be usual.
 */
export function forItsLength(kind: readonly CatchEntry[], entry: CatchEntry): { heavy: boolean; usual: number } | null {
  const length = measureOf(entry, "length");
  const weight = measureOf(entry, "weight");
  if (length?.kind !== "length" || weight?.kind !== "weight" || !(weight.pounds > 0)) return null;
  const pairs = sizePairs(kind.filter((other) => other.id !== entry.id));
  if (pairs.length < 3) return null;
  const usual = likelyWeight(pairs, length.inches);
  if (usual === null || !(usual > 0)) return null;
  const ratio = weight.pounds / usual;
  return ratio > 1.15 ? { heavy: true, usual } : ratio < 0.85 ? { heavy: false, usual } : null;
}
