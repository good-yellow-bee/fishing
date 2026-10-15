import { Link } from "react-router-dom";
import type { CatchEntry } from "@stillwater/shared";
import { t, useT } from "../i18n";
import { speciesCounts, speciesLink } from "./speciesLink";

/** The kinds among some fish, each a link to its own page. */
export function SpeciesChips({ catches }: { catches: readonly CatchEntry[] }) {
  useT();
  if (catches.length === 0) return null;
  return (
    <p className="species-chips">
      {speciesCounts(catches).map((row) => (
        <Link key={row.species} to={speciesLink(row.species)}>
          {t(row.species)} ({row.count})
        </Link>
      ))}
    </p>
  );
}
