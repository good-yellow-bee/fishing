import { Link } from "react-router-dom";
import type { CatchEntry } from "@stillwater/shared";
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
