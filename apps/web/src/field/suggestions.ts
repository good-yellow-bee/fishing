import { catchesNewestFirst, lureTally, type Logbook } from "@stillwater/shared";

/**
 * Names for a form's suggestion list: the player's own first, most used on
 * top, then the stock names they haven't used. One name never shows twice,
 * whatever its case. `shown` turns a stored name into the words on screen.
 */
export function ownFirst(own: readonly string[], stock: readonly string[], shown: (name: string) => string = (name) => name): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of [...own, ...stock]) {
    const words = shown(name).trim();
    const key = words.toLowerCase();
    if (!words || seen.has(key)) continue;
    seen.add(key);
    out.push(words);
  }
  return out;
}

/** The lures this book has taken fish on, most fish first. */
export function bookLures(book: Logbook, limit = 12) {
  return lureTally(book, limit).map((row) => row.lure);
}

/** The lure of the newest fish on a trip, so the next fish logged there starts with it. */
export function tripLure(book: Logbook, tripId: string | undefined) {
  if (!tripId) return "";
  return catchesNewestFirst(book).find((entry) => entry.tripId === tripId)?.lure ?? "";
}
