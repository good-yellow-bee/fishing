import { measureOf, type CatchEntry } from "@stillwater/shared";
import { t } from "../i18n";
import { measureText } from "../i18n/content";

/**
 * "Best here: Roach, 10 in · Common carp, 16 lb": a water's longest fish, and its heaviest when that is another fish, so
 * a big fish only weighed is not hidden behind a small one measured. One kind reads once: "Common carp, 30 in · 16 lb".
 */
export function bestHereText({ longest, heaviest }: { longest: CatchEntry | null; heaviest: CatchEntry | null }, kindName: (species: string) => string): string | null {
  if (!longest || !heaviest || longest.id === heaviest.id) {
    const entry = longest ?? heaviest;
    return entry ? t("Best here: {species}, {size}", { species: kindName(entry.species), size: measureText(measureOf(entry, longest ? "length" : "weight")!) }) : null;
  }
  const length = measureText(measureOf(longest, "length")!);
  const weight = measureText(measureOf(heaviest, "weight")!);
  return kindName(longest.species) === kindName(heaviest.species)
    ? t("Best here: {species}, {size}", { species: kindName(longest.species), size: `${length} · ${weight}` })
    : t("Best here: {species}, {size} · {heavier}, {weight}", { species: kindName(longest.species), size: length, heavier: kindName(heaviest.species), weight });
}
