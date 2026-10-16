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
