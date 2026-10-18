import { measureOf, type CatchEntry, type Logbook } from "@stillwater/shared";
import { t } from "../i18n";
import { measureText } from "../i18n/content";
import { kindToBeat } from "./suggestions";

/**
 * What a fish about to be added means for the book, said with the save: the first of its kind, or a new best by weight
 * (else by length) for its kind, with the size it beat. Null when it is neither.
 */
export function catchNews(book: Logbook, fish: Pick<CatchEntry, "species" | "measure" | "alsoMeasure">): string | null {
  // Against the angler's own fish: the game's first walleye doesn't make a real one any less the first.
  const before = kindToBeat(book, fish.species);
  const name = t(fish.species);
  if (before.length === 0) return t("First {species} in the book.", { species: name });
  for (const kind of ["weight", "length"] as const) {
    const size = measureOf(fish as CatchEntry, kind);
    if (!size) continue;
    let best: number | null = null;
    let bestSize = size;
    for (const entry of before) {
      const other = measureOf(entry, kind);
      const amount = other ? (other.kind === "length" ? other.inches : other.pounds) : null;
      if (other && amount !== null && (best === null || amount > best)) {
        best = amount;
        bestSize = other;
      }
    }
    const amount = size.kind === "length" ? size.inches : size.pounds;
    // Beating a size, not being the first weighed: a kind never weighed before has nothing to beat.
    if (best !== null && amount > best) return t("New best {species}: {size} (was {was}).", { species: name, size: measureText(size), was: measureText(bestSize) });
  }
  return null;
}
