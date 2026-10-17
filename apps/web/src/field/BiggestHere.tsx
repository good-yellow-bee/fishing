import { Link } from "react-router-dom";
import { measureOf, personalBests, type CatchEntry } from "@stillwater/shared";
import { t } from "../i18n";
import { measureText } from "../i18n/content";
import { catchLink, type ListKey } from "./catchList";
import { speciesCounts, speciesLink } from "./speciesLink";

/** The longest and the heaviest of some fish, either null when none was measured that way. */
export function biggestOf(catches: readonly CatchEntry[]): { longest: CatchEntry | null; heaviest: CatchEntry | null } {
  const { longest, heaviest } = personalBests({ spots: [], trips: [], catches: [...catches] });
  return { longest, heaviest };
}

/** The sizes of a group's biggest fish, each opening its fish: "28.5 in · 9.2 lb", or one of them. */
export function BiggestLinks({ catches, list }: { catches: readonly CatchEntry[]; list?: ListKey }) {
  const { longest, heaviest } = biggestOf(catches);
  const rows = [
    longest ? { entry: longest, kind: "length" as const } : null,
    heaviest ? { entry: heaviest, kind: "weight" as const } : null,
  ].flatMap((row) => (row ? [row] : []));
  return (
    <>
      {rows.map(({ entry, kind }, index) => {
        const measure = measureOf(entry, kind)!;
        return (
          <span key={kind}>
            {/* The dot holds to the size before it, so a wrapped line does not start with one. */}
            {index > 0 ? "\u00a0· " : null}
            <Link to={catchLink(entry.id, list)}>{measureText(measure)}</Link>
          </span>
        );
      })}
    </>
  );
}

/** A water's biggest fish of each kind, once more than one kind came from it: the water page's one record says less. */
export function BiggestHere({ catches, spotId }: { catches: readonly CatchEntry[]; spotId: string }) {
  const kinds = speciesCounts(catches);
  if (kinds.length < 2) return null;
  return (
    <>
      <div className="section-head">
        <h2>{t("Biggest here")}</h2>
      </div>
      <ul className="species-waters">
        {kinds.map(({ species }) => {
          const key = species.trim().toLowerCase();
          return (
            <li key={key}>
              <Link to={speciesLink(species)}>{t(species)}</Link>
              <span className="meta sizes">
                <BiggestLinks catches={catches.filter((entry) => entry.species.trim().toLowerCase() === key)} list={`water:${spotId}`} />
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}
