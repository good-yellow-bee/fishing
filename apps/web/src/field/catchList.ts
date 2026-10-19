import { catchesForSpot, catchesForTrip, catchesNewestFirst, type CatchEntry, type Logbook } from "@stillwater/shared";
import { findCatches } from "./CatchSearch";
import { FIND_PARAM, findLink } from "./findLinks";
import { kindOnPage, speciesLink } from "./speciesLink";
import { largestFirst } from "./largestFirst";
import { ORDER_PARAM } from "./MatchOrder";

/** The address parameter that says which list a catch was opened from, so its steps keep to that list. */
export const LIST_PARAM = "in";

/**
 * "find:pike" (the search on Home), "catches:pike" (the same search on the Catches page), "species:Northern pike",
 * "trip:<id>" or "water:<id>": a list a catch card can be opened from. "find-largest:pike", "catches-largest:pike",
 * "species-largest:Northern pike" and "water-largest:<id>" are those lists shown largest first, and "book-largest:all"
 * the whole Catches list shown largest first.
 */
export type ListKey = `${"find" | "catches" | "species" | "water"}${"" | "-largest"}:${string}` | `trip:${string}` | "book-largest:all";

/** Whether a list steps through its fish largest first, not newest first. */
export const largestList = (key: string | undefined) => Boolean(key && /^(find|catches|species|water|book)-largest:/.test(key));

/** The page a list's back link opens, largest first again when the list was. */
const inOrder = (back: string, largest: boolean) => (largest ? `${back}${back.includes("?") ? "&" : "?"}${ORDER_PARAM}=largest` : back);

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
          return largest ? { rows: largestFirst(rows), back: inOrder(back, true) } : { rows, back };
        })()
      : search === "species"
        ? { rows: largest ? largestFirst(kindOnPage(book, value)) : kindOnPage(book, value), back: inOrder(speciesLink(value), largest) }
        : kind === "book-largest"
          ? { rows: largestFirst(catchesNewestFirst(book)), back: inOrder("/catches", true) }
        : kind === "trip"
          ? { rows: catchesForTrip(book, value), back: `/trips/${value}` }
          : search === "water"
            ? { rows: largest ? largestFirst(catchesForSpot(book, value)) : catchesForSpot(book, value), back: inOrder(`/spots/${value}`, largest) }
            : null;
  if (!found || !found.rows.some((row) => row.id === id)) return null;
  return { key: list as ListKey, ...found };
}
