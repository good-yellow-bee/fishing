import { measureOf, type CatchEntry } from "@stillwater/shared";
import { t } from "../i18n";
import { measureText } from "../i18n/content";
import { kindKey } from "./speciesLink";

/**
 * "Best here: Roach, 10 in · Common carp, 16 lb": a water's longest fish and its heaviest, so a big fish only weighed is
 * not hidden behind a small one measured. One fish, or one kind, is named once: "Common carp, 30 in · 16 lb".
 */
export function bestHereText({ longest, heaviest }: { longest: CatchEntry | null; heaviest: CatchEntry | null }, kindName: (species: string) => string): string | null {
  const length = longest && measureText(measureOf(longest, "length")!);
  const weight = heaviest && measureText(measureOf(heaviest, "weight")!);
  const first = longest ?? heaviest;
  if (!first) return null;
  // The dot kept to the measure before it, so a wrapped line never starts with one.
  if (!longest || !heaviest || longest.id === heaviest.id) return t("Best here: {species}, {size}", { species: kindName(first.species), size: [length, weight].filter(Boolean).join("\u00a0· ") });
  return kindKey(longest.species) === kindKey(heaviest.species)
    ? t("Best here: {species}, {size}\u00a0· {weight}", { species: kindName(longest.species), size: length!, weight: weight! })
    : t("Best here: {species}, {size}\u00a0· {heavier}, {weight}", { species: kindName(longest.species), size: length!, heavier: kindName(heaviest.species), weight: weight! });
}
