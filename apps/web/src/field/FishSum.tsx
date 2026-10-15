import { personalBests, type CatchEntry } from "@stillwater/shared";
import { t, tn, useT } from "../i18n";
import { measureText } from "../i18n/content";
import { fishCountLabel } from "./format";

/** "6 fish · 3 species · Largest: Northern pike, 28 in" for the fish of one outing or one water. */
export function FishSum({ catches }: { catches: readonly CatchEntry[] }) {
  useT();
  if (catches.length === 0) return null;
  const species = new Set(catches.map((entry) => entry.species)).size;
  const bests = personalBests({ spots: [], trips: [], catches: [...catches] });
  const largest = bests.heaviest ?? bests.longest;
  return (
    <p className="meta fish-sum">
      {fishCountLabel(catches.length)} · {tn(species, "{n} species", "{n} species")}
      {largest ? ` · ${t("Largest: {species}, {size}", { species: t(largest.species), size: measureText(largest.measure) })}` : ""}
    </p>
  );
}
