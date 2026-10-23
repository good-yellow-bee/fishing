import { Link } from "react-router-dom";
import type { CatchEntry } from "@stillwater/shared";
import { t, useT } from "../i18n";
import { pageCounts, speciesCounts, speciesLink, kindNames } from "./speciesLink";
import { exactTerm, findWithLink } from "./findLinks";
import { pieceTally } from "./pieceTally";
import { pieceName } from "./gear/pieceKey";

/** The kinds among some fish, each a link to its own page, or with `within` (a search, a water's) to just those fish there. */
/** With `outing`, each kind opens that outing's fish of it, as counted; with `water` too, only those on its water. */
/** `within` null: counted as within one, but no search finds just these fish (a water with no name), so plain words. */
export function SpeciesChips({
  catches,
  within,
  outing,
  water,
  kindName: named,
}: {
  catches: readonly CatchEntry[];
  within?: string | null;
  outing?: { date: string; title: string };
  water?: string;
  /** How to name a kind; by default as these fish write it most. */
  kindName?: (species: string) => string;
}) {
  useT();
  if (catches.length === 0) return null;
  // As the book writes the kind most, as its page and the kinds list name it ("Zander" for a book of "zander").
  const kindName = named ?? kindNames(catches);
  return (
    <p className="species-chips">
      {/* A chip that opens the kind's page counts as that page does. */}
      {(within !== undefined || outing ? speciesCounts(catches) : pageCounts(catches)).map((row) =>
        within === null ? (
          <span key={row.species}>
            {kindName(row.species)} ({row.count})
          </span>
        ) : (
        <Link
          key={row.species}
          to={
            outing
              ? findWithLink([exactTerm("outing", `${outing.date} ${outing.title}`), ...(water ? [exactTerm("water", water)] : [])].join(" + "), exactTerm("species", kindName(row.species)))
              : within
                ? findWithLink(within, exactTerm("species", kindName(row.species)))
                : speciesLink(row.species)
          }
        >
          {/* "zander" and "tench" as the kinds list writes them, in the reader's language. */}
          {kindName(row.species)} ({row.count})
        </Link>
        ),
      )}
    </p>
  );
}

/**
 * What an outing's fish took, most first, each opening that outing's fish on that lure: "Jig (2)".
 * Only once two or more fish name a lure.
 */
export function LureChips({
  catches,
  outing,
  water,
  lureName = pieceName,
}: {
  catches: readonly CatchEntry[];
  outing: { date: string; title: string };
  water?: string;
  /** How the book names a lure; by default as these fish write it most. */
  lureName?: (lure: string) => string;
}) {
  useT();
  // One chip a lure however it was spelled, as the lure search it opens groups it: "Spinnerbait (4)", not two of 2.
  const lures = pieceTally(catches, Infinity);
  if (lures.reduce((sum, row) => sum + row.count, 0) < 2) return null;
  return (
    <p className="species-chips lure-chips">
      <span className="meta">{t("Took:")}</span>
      {lures.map((row) => (
        // With the water too: two outings of a day can share a name, or both go unnamed.
        <Link key={row.lure} to={findWithLink([exactTerm("outing", `${outing.date} ${outing.title}`), ...(water ? [exactTerm("water", water)] : [])].join(" + "), exactTerm("lure", lureName(row.lure)))}>
          {lureName(row.lure)} ({row.count})
        </Link>
      ))}
    </p>
  );
}
