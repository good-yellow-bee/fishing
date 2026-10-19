import { catchesNewestFirst, type CatchEntry, type Logbook } from "@stillwater/shared";
import { offPlayLake } from "./playLake";
import { isSampleCatch } from "./bookCopy";
import { t } from "../i18n";
import { bookSpelling } from "./gear/pieceKey";

/** The page for one kind of fish, by the name the book keeps it under. */
export function speciesLink(species: string) {
  return `/species/${encodeURIComponent(species)}`;
}

/** That kind's fish, newest first; the name matches whatever its case. */
export function catchesOfSpecies(book: Logbook, species: string): CatchEntry[] {
  const key = species.trim().toLowerCase();
  return catchesNewestFirst(book).filter((entry) => entry.species.trim().toLowerCase() === key);
}

/**
 * The fish a kind's page lists, newest first: the angler's own, leaving the game's out, and the sample week's once
 * they have fish of their own, as Bests counts them; a kind only ever caught in the sample or the game shows those.
 * Every count that opens the kind's page goes by this.
 */
export function kindOnPage(book: Logbook, species: string): CatchEntry[] {
  const every = catchesOfSpecies(book, species);
  const real = every.filter(offPlayLake);
  const ownAnywhere = book.catches.some((entry) => offPlayLake(entry) && !isSampleCatch(entry.id));
  const own = ownAnywhere ? real.filter((entry) => !isSampleCatch(entry.id)) : real;
  return own.length > 0 ? own : real.length > 0 ? real : every;
}

/**
 * Each kind among `catches` counted as its page counts it (kindOnPage): the angler's own fish, the sample week's once
 * they have none of that kind, or its game fish when that is all.
 */
export function pageCounts(catches: readonly CatchEntry[]) {
  const real = catches.filter(offPlayLake);
  const ownAnywhere = real.some((entry) => !isSampleCatch(entry.id));
  // Tier by tier, each kind taking the first that has any of it.
  const tiers = [ownAnywhere ? real.filter((entry) => !isSampleCatch(entry.id)) : real, real, catches];
  const known = new Set<string>();
  const rows: ReturnType<typeof speciesCounts> = [];
  for (const tier of tiers) {
    const fresh = speciesCounts(tier).filter((row) => !known.has(row.species.trim().toLowerCase()));
    for (const row of fresh) known.add(row.species.trim().toLowerCase());
    rows.push(...fresh);
  }
  return rows.sort((a, b) => b.count - a.count || a.species.localeCompare(b.species));
}

/** The waters this kind came from, most fish first, then by name. */
export function speciesWaters(book: Logbook, catches: readonly CatchEntry[]) {
  const counts = new Map<string, number>();
  for (const entry of catches) counts.set(entry.spotId, (counts.get(entry.spotId) ?? 0) + 1);
  return [...counts]
    .map(([spotId, count]) => ({ spotId, name: book.spots.find((spot) => spot.id === spotId)?.name ?? null, count }))
    .sort((a, b) => b.count - a.count || (a.name ?? "").localeCompare(b.name ?? ""));
}

/** The kinds among some fish, most first, then by name, keeping the book's name for each. */
/**
 * A kind's name as the book writes it most, in the reader's language: "zander", "Zander " and "Zander" are one kind, so
 * a sheet or a copied text names it once, as "Sandacz" in Polish, not as three.
 */
export function kindNames(catches: readonly CatchEntry[]): (species: string) => string {
  const spellings = new Map<string, Map<string, number>>();
  for (const entry of catches) {
    const name = entry.species.trim();
    const key = name.toLowerCase();
    const row = spellings.get(key) ?? new Map<string, number>();
    row.set(name, (row.get(name) ?? 0) + 1);
    spellings.set(key, row);
  }
  return (species) => {
    const name = species.trim();
    // The most-used spelling; a tie goes to one with a capital, as the kinds list writes them.
    const best = [...(spellings.get(name.toLowerCase()) ?? new Map([[name, 1]]))].sort((a, b) => b[1] - a[1] || Number(/^\p{Lu}/u.test(b[0])) - Number(/^\p{Lu}/u.test(a[0])))[0]![0];
    // As the dictionary spells it, so a kind only ever typed "zander" still reads "Sandacz" in Polish.
    return t(bookSpelling(best));
  };
}

export function speciesCounts(catches: readonly CatchEntry[]) {
  const counts = new Map<string, { species: string; count: number }>();
  for (const entry of catches) {
    const key = entry.species.trim().toLowerCase();
    const row = counts.get(key) ?? { species: entry.species.trim(), count: 0 };
    row.count += 1;
    counts.set(key, row);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.species.localeCompare(b.species));
}
