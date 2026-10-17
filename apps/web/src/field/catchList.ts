import { catchesForSpot, catchesForTrip, type CatchEntry, type Logbook } from "@stillwater/shared";
import { findCatches } from "./CatchSearch";
import { FIND_PARAM, findLink } from "./findLinks";
import { kindOnPage, speciesLink } from "./speciesLink";

/** The address parameter that says which list a catch was opened from, so its steps keep to that list. */
export const LIST_PARAM = "in";

/**
 * "find:pike" (the search on Home), "catches:pike" (the same search on the Catches page), "species:Northern pike",
 * "trip:<id>" or "water:<id>": a list a catch card can be opened from.
 */
export type ListKey = `${"find" | "catches" | "species" | "trip" | "water"}:${string}`;

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
  const found =
    kind === "find" || kind === "catches"
      ? {
          rows: findCatches(book, value, t, pictured),
          back: kind === "find" ? findLink(value) : `/catches?${new URLSearchParams({ [FIND_PARAM]: value }).toString()}`,
        }
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
