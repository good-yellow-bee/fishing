import { Link } from "react-router-dom";
import { measureOf, personalBests, type CatchEntry } from "@stillwater/shared";
import { t, tn, useT } from "../i18n";
import { measureText } from "../i18n/content";
import { fishCountLabel } from "./format";
import { catchLink, type ListKey } from "./catchList";
import { FROM_LIST } from "./leaveDeleted";
import { kindKey, kindNames } from "./speciesLink";

/** The dot held to the words before it, so a wrap never leaves it alone at the start of a line. */
const SEP = "\u00a0· ";

/** "6 fish · 3 species · 2 released · Largest: Northern pike, 28 in" for the fish of one outing or one water. */
/** `oneKind` is for a page about one species, where naming it again says nothing. */
/** `best` is the fish the largest is picked from, when that is not all of them. */
/** `list` is the page's list of fish, so the largest opens within it, its arrows stepping through the page's fish. */
/** `kindName` names a kind as the whole book does; by default as these fish write it most. */
export function FishSum({
  catches,
  oneKind = false,
  best = catches,
  list,
  kindName: named,
}: {
  catches: readonly CatchEntry[];
  oneKind?: boolean;
  best?: readonly CatchEntry[];
  list?: ListKey;
  kindName?: (species: string) => string;
}) {
  useT();
  if (catches.length === 0) return null;
  // A kind however it was typed is one, and named as most of its fish are.
  const species = new Set(catches.map((entry) => kindKey(entry.species))).size;
  const kindName = named ?? kindNames(catches);
  const bests = personalBests({ spots: [], trips: [], catches: [...best] });
  // One fish can be both the heaviest and the longest; two different ones are both named, so a long pike isn't hidden behind a light perch.
  const both = bests.heaviest && bests.longest && bests.heaviest.id !== bests.longest.id;
  const largest = bests.heaviest ?? bests.longest;
  // The size it is largest by: its weight when any fish here was weighed, else its length.
  const size = largest ? measureText(measureOf(largest, bests.heaviest ? "weight" : "length")!) : "";
  const released = catches.filter((entry) => entry.released).length;
  return (
    <p className="meta fish-sum">
      {fishCountLabel(catches.length)}
      {oneKind ? "" : `${SEP}${tn(species, "{n} species", "{n} species")}`}
      {released > 0 ? `${SEP}${tn(released, "{n} released", "{n} released")}` : ""}
      {both ? (
        <>
          {SEP}
          <BestLink entry={bests.heaviest!} kind="weight" oneKind={oneKind} list={list} kindName={kindName} />
          {SEP}
          <BestLink entry={bests.longest!} kind="length" oneKind={oneKind} list={list} kindName={kindName} />
        </>
      ) : largest ? (
        <>
          {SEP}
          {/* The largest opens its own catch page. */}
          <Link to={catchLink(largest.id, list)} state={list ? FROM_LIST : undefined}>
            {oneKind
              ? t("Largest: {size}", { size })
              : t("Largest: {species}, {size}", { species: kindName(largest.species), size })}
          </Link>
        </>
      ) : null}
    </p>
  );
}

/** "Heaviest: Yellow perch, 0.5 lb" or "Longest: 40 in", opening that fish. */
function BestLink({ entry, kind, oneKind, list, kindName }: { entry: CatchEntry; kind: "weight" | "length"; oneKind: boolean; list?: ListKey; kindName: (species: string) => string }) {
  const size = measureText(measureOf(entry, kind)!);
  const label =
    kind === "weight"
      ? oneKind
        ? t("Heaviest: {size}", { size })
        : t("Heaviest: {species}, {size}", { species: kindName(entry.species), size })
      : oneKind
        ? t("Longest: {size}", { size })
        : t("Longest: {species}, {size}", { species: kindName(entry.species), size });
  return (
    <Link to={catchLink(entry.id, list)} state={list ? FROM_LIST : undefined}>
      {label}
    </Link>
  );
}
