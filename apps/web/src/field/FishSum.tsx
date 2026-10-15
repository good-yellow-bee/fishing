import { Link } from "react-router-dom";
import { personalBests, type CatchEntry } from "@stillwater/shared";
import { t, tn, useT } from "../i18n";
import { measureText } from "../i18n/content";
import { fishCountLabel } from "./format";

/** "6 fish · 3 species · 2 released · Largest: Northern pike, 28 in" for the fish of one outing or one water. */
/** `oneKind` is for a page about one species, where naming it again says nothing. */
export function FishSum({ catches, oneKind = false }: { catches: readonly CatchEntry[]; oneKind?: boolean }) {
  useT();
  if (catches.length === 0) return null;
  const species = new Set(catches.map((entry) => entry.species)).size;
  const bests = personalBests({ spots: [], trips: [], catches: [...catches] });
  const largest = bests.heaviest ?? bests.longest;
  const released = catches.filter((entry) => entry.released).length;
  return (
    <p className="meta fish-sum">
      {fishCountLabel(catches.length)}
      {oneKind ? "" : ` · ${tn(species, "{n} species", "{n} species")}`}
      {released > 0 ? ` · ${tn(released, "{n} released", "{n} released")}` : ""}
      {largest ? (
        <>
          {" · "}
          {/* The largest opens its own catch page. */}
          <Link to={`/catches/${largest.id}`}>
            {oneKind
              ? t("Largest: {size}", { size: measureText(largest.measure) })
              : t("Largest: {species}, {size}", { species: t(largest.species), size: measureText(largest.measure) })}
          </Link>
        </>
      ) : null}
    </p>
  );
}
