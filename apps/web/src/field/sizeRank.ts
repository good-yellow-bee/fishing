import { measureOf, type CatchEntry, type Measure } from "@stillwater/shared";
import { t } from "../i18n";

const size = (measure: Measure) => (measure.kind === "length" ? measure.inches : measure.pounds);

/**
 * Where a fish sits among the others of its kind measured the same way: "Longer than 7 of the 9 others of its kind".
 * Null with fewer than three others to weigh it against, or when it beats none of them.
 */
export function sizeRank(kind: readonly CatchEntry[], entry: CatchEntry): string | null {
  const own = entry.measure;
  const others = kind.flatMap((other) => {
    if (other.id === entry.id) return [];
    const theirs = measureOf(other, own.kind);
    return theirs ? [size(theirs)] : [];
  });
  if (others.length < 3) return null;
  const beaten = others.filter((value) => value < size(own)).length;
  if (beaten === 0) return null;
  const vars = { count: beaten, total: others.length };
  return own.kind === "length" ? t("Longer than {count} of the {total} others of its kind", vars) : t("Heavier than {count} of the {total} others of its kind", vars);
}

/**
 * The fish this one is the biggest since: the newest earlier fish of its kind at least as big, once three or more
 * of the kind came in between, all smaller. Null when nothing earlier was as big (a best at the time) or the gap is short.
 */
export function biggestSince(kind: readonly CatchEntry[], entry: CatchEntry): CatchEntry | null {
  const own = size(entry.measure);
  const at = Date.parse(entry.caughtAt);
  const earlier = kind
    .filter((other) => other.id !== entry.id && Date.parse(other.caughtAt) < at)
    .sort((a, b) => Date.parse(b.caughtAt) - Date.parse(a.caughtAt));
  let between = 0;
  for (const other of earlier) {
    const theirs = measureOf(other, entry.measure.kind);
    if (theirs && size(theirs) >= own) return between >= 3 ? other : null;
    if (theirs) between += 1;
  }
  return null;
}
