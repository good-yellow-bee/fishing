import { catchesForSpot, catchesForTrip, type CatchEntry, type Logbook } from "@stillwater/shared";
import { findCatches } from "./CatchSearch";
import { FIND_PARAM, findLink } from "./findLinks";
import { kindOnPage, speciesLink } from "./speciesLink";
import { largestFirst } from "./largestFirst";
import { ORDER_PARAM } from "./MatchOrder";

/** The address parameter that says which list a catch was opened from, so its steps keep to that list. */
export const LIST_PARAM = "in";

/**
 * "find:pike" (the search on Home), "catches:pike" (the same search on the Catches page), "species:Northern pike",
 * "trip:<id>" or "water:<id>": a list a catch card can be opened from. "find-largest:pike" and "catches-largest:pike" are
 * those searches shown largest first.
 */
export type ListKey = `${"find" | "catches" | "find-largest" | "catches-largest" | "species" | "trip" | "water"}:${string}`;

/** Whether a list steps through its fish largest first, not newest first. */
export const largestList = (key: string | undefined) => Boolean(key && /^(find|catches)-largest:/.test(key));

/** A catch page address that remembers the list it was opened from. */
export function catchLink(id: string, list?: ListKey): string {
  return list ? `/catches/${id}?${LIST_PARAM}=${encodeURIComponent(list)}` : `/catches/${id}`;
}

/**
 * The fish of the list a catch was opened from, newest first, and the page that shows it; null for no list, one this
 * book can't read, or one the fish isn't in (an old link), so the steps fall back to the whole book.
 */
export function catchList(
  book: Logbook,
  list: string | null,
  id: string,
  t: (text: string) => string,
  pictured: (id: string) => boolean,
): { key: ListKey; rows: CatchEntry[]; back: string } | null {
  const at = list?.indexOf(":") ?? -1;
  if (!list || at < 0) return null;
  const kind = list.slice(0, at);
  const value = list.slice(at + 1);
  if (!value) return null;
  const search = kind.replace(/-largest$/, "");
  const largest = search !== kind;
  const found =
    search === "find" || search === "catches"
      ? (() => {
          const rows = findCatches(book, value, t, pictured);
          const back = search === "find" ? findLink(value) : `/catches?${new URLSearchParams({ [FIND_PARAM]: value }).toString()}`;
          return largest ? { rows: largestFirst(rows), back: `${back}&${ORDER_PARAM}=largest` } : { rows, back };
        })()
      : kind === "species"
        ? { rows: kindOnPage(book, value), back: speciesLink(value) }
        : kind === "trip"
          ? { rows: catchesForTrip(book, value), back: `/trips/${value}` }
          : kind === "water"
            ? { rows: catchesForSpot(book, value), back: `/spots/${value}` }
            : null;
  if (!found || !found.rows.some((row) => row.id === id)) return null;
  return { key: list as ListKey, ...found };
}
