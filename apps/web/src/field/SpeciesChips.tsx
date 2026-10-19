import { Link } from "react-router-dom";
import type { CatchEntry } from "@stillwater/shared";
import { t, useT } from "../i18n";
import { pageCounts, speciesCounts, speciesLink } from "./speciesLink";
import { exactTerm, findWithLink } from "./findLinks";
import { pieceTally } from "./pieceTally";

/** The kinds among some fish, each a link to its own page, or with `within` (a water's name) to just those fish there. */
/** With `outing`, each kind opens that outing's fish of it, as counted. */
export function SpeciesChips({ catches, within, outing }: { catches: readonly CatchEntry[]; within?: string; outing?: { date: string; title: string } }) {
  useT();
  if (catches.length === 0) return null;
  return (
    <p className="species-chips">
      {/* A chip that opens the kind's page counts as that page does. */}
      {(within || outing ? speciesCounts(catches) : pageCounts(catches)).map((row) => (
        <Link
          key={row.species}
          to={
            outing
              ? findWithLink(exactTerm("outing", `${outing.date} ${outing.title}`), exactTerm("species", t(row.species)))
              : within
                ? findWithLink(exactTerm("water", within), exactTerm("species", t(row.species)))
                : speciesLink(row.species)
          }
        >
          {t(row.species)} ({row.count})
        </Link>
      ))}
    </p>
  );
}

/**
 * What an outing's fish took, most first, each opening that outing's fish on that lure: "Jig (2)".
 * Only once two or more fish name a lure.
 */
export function LureChips({ catches, outing, water }: { catches: readonly CatchEntry[]; outing: { date: string; title: string }; water?: string }) {
  useT();
  // One chip a lure however it was spelled, as the lure search it opens groups it: "Spinnerbait (4)", not two of 2.
  const lures = pieceTally(catches, Infinity);
  if (lures.reduce((sum, row) => sum + row.count, 0) < 2) return null;
  return (
    <p className="species-chips lure-chips">
      <span className="meta">{t("Took:")}</span>
      {lures.map((row) => (
        // With the water too: two outings of a day can share a name, or both go unnamed.
        <Link key={row.lure} to={findWithLink([exactTerm("outing", `${outing.date} ${outing.title}`), ...(water ? [exactTerm("water", water)] : [])].join(" + "), exactTerm("lure", t(row.lure)))}>
          {t(row.lure)} ({row.count})
        </Link>
      ))}
    </p>
  );
}
