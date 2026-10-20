import { foldText, type CatchEntry } from "@stillwater/shared";
import { speciesCounts } from "../speciesLink";

export type KindPair = { shown: string; from: string; into: string; fromCount: number; intoCount: number };

/**
 * Kinds of fish stored under two names that read the same on screen ("Okoń" typed in Polish beside "European perch"
 * picked from the list): each pair once, the name with fewer fish to be joined into the one with more.
 */
/** `same` is how two names are told to be one kind (by default as they show); `show` is what the line calls it. */
export function kindPairs(catches: readonly CatchEntry[], show: (name: string) => string, same: (name: string) => string = show): KindPair[] {
  // A kind however it was typed ("Perch", "perch ", "Perches") is one name already, under the spelling most of its fish
  // carry: joining it would rewrite the very fish the list names it by.
  const byShown = new Map<string, { name: string; count: number }[]>();
  for (const { species: name, count } of speciesCounts(catches)) {
    const key = foldText(same(name));
    byShown.set(key, [...(byShown.get(key) ?? []), { name, count }]);
  }
  const pairs: KindPair[] = [];
  for (const rows of byShown.values()) {
    if (rows.length < 2) continue;
    // A tie goes to the list's own name, which reads right in either language.
    const listed = (name: string) => Number(same(name) !== name);
    const [into, ...rest] = [...rows].sort((a, b) => b.count - a.count || listed(b.name) - listed(a.name) || a.name.localeCompare(b.name));
    for (const from of rest) pairs.push({ shown: show(into!.name), from: from.name, into: into!.name, fromCount: from.count, intoCount: into!.count });
  }
  return pairs.sort((a, b) => a.shown.localeCompare(b.shown));
}
