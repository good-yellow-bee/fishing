import type { CatchEntry, LureTally } from "@stillwater/shared";
import { pieceName, shownPieceKey } from "./gear/pieceKey";
import { mostWritten } from "./speciesLink";
import { countedFish } from "./milestones";

/**
 * The lures that took the most fish, most first, grouped as the exact lure search and Gear group them: "Spinnerbait"
 * and "Spinnerbaits" are one row, under the spelling most of its fish were logged with, so a row's count is what its
 * link opens.
 */
export function pieceTally(catches: readonly CatchEntry[], limit = 5): LureTally[] {
  const groups = new Map<string, { count: number; spellings: Map<string, number> }>();
  for (const entry of catches) {
    const name = entry.lure.trim().replace(/\s+/g, " ");
    if (!name) continue;
    const key = shownPieceKey(name);
    const group = groups.get(key) ?? { count: 0, spellings: new Map<string, number>() };
    group.count += 1;
    group.spellings.set(name, (group.spellings.get(name) ?? 0) + 1);
    groups.set(key, group);
  }
  return [...groups.values()]
    // A tie of spellings goes to one with a capital ("Jig", not "jig"), then to the first in the alphabet, so a list in
    // any order names it the same: "Spinner" on the card and the page.
    .map((group) => ({ lure: mostWritten(group.spellings), count: group.count }))
    .sort((a, b) => b.count - a.count || a.lure.localeCompare(b.lure))
    .slice(0, limit);
}

/**
 * A lure's name as the book writes it most, in the reader's language: "Spinner" and "spinner " are one piece, so a sheet
 * or a copied text names it once, as `kindNames` does for kinds.
 */
export function lureNames(catches: readonly CatchEntry[]): (lure: string) => string {
  const spelled = new Map(pieceTally(catches, Infinity).map((row) => [shownPieceKey(row.lure), row.lure]));
  return (lure) => (lure.trim() ? pieceName(spelled.get(shownPieceKey(lure.trim())) ?? lure) : "");
}

const lureNameCache = new WeakMap<readonly CatchEntry[], (lure: string) => string>();

/** lureNames for a book's own fish, kept while the book stays the same: a lure named as Gear and Bests name it. */
export function bookLureName(catches: readonly CatchEntry[]): (lure: string) => string {
  let name = lureNameCache.get(catches);
  if (!name) lureNameCache.set(catches, (name = lureNames(countedFish(catches))));
  return name;
}

/** Whether a fish was taken on the piece `lure` names, however it was spelled. */
export function onPiece(entry: CatchEntry, lure: string): boolean {
  return entry.lure.trim() !== "" && shownPieceKey(entry.lure.trim()) === shownPieceKey(lure.trim());
}
