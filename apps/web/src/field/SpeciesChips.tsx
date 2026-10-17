import { Link } from "react-router-dom";
import { lureTally, type CatchEntry } from "@stillwater/shared";
import { t, useT } from "../i18n";
import { speciesCounts, speciesLink } from "./speciesLink";
import { exactTerm, findWithLink } from "./findLinks";

/** The kinds among some fish, each a link to its own page, or with `within` (a water's name) to just those fish there. */
export function SpeciesChips({ catches, within }: { catches: readonly CatchEntry[]; within?: string }) {
  useT();
  if (catches.length === 0) return null;
  return (
    <p className="species-chips">
      {speciesCounts(catches).map((row) => (
        <Link key={row.species} to={within ? findWithLink(exactTerm("water", within), exactTerm("species", t(row.species))) : speciesLink(row.species)}>
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
export function LureChips({ catches, outing }: { catches: readonly CatchEntry[]; outing: { date: string; title: string } }) {
  useT();
  const lures = lureTally({ spots: [], trips: [], catches: [...catches] }, Infinity);
  if (lures.reduce((sum, row) => sum + row.count, 0) < 2) return null;
  return (
    <p className="species-chips lure-chips">
      <span className="meta">{t("Took:")}</span>
      {lures.map((row) => (
        <Link key={row.lure} to={findWithLink(exactTerm("outing", `${outing.date} ${outing.title}`), exactTerm("lure", t(row.lure)))}>
          {t(row.lure)} ({row.count})
        </Link>
      ))}
    </p>
  );
}
