import { measuresOf, personalBests, type CatchEntry, type Logbook } from "@stillwater/shared";
import { offPlayLake } from "./playLake";

export type CatchBadge = "book" | "species" | null;

const cache = new WeakMap<Logbook, Map<string, Exclude<CatchBadge, null>>>();

/** Every badged fish in the book, worked out once per book. A game fish wins no badge and takes none away. */
export function bookBadges(book: Logbook): Map<string, Exclude<CatchBadge, null>> {
  const known = cache.get(book);
  if (known) return known;
  const real = { ...book, catches: book.catches.filter(offPlayLake) };
  const bests = personalBests(real);
  const rivals = new Map<string, number>();
  for (const entry of real.catches) {
    for (const measure of measuresOf(entry)) {
      const key = `${entry.species.trim().toLowerCase()}\u0000${measure.kind}`;
      rivals.set(key, (rivals.get(key) ?? 0) + 1);
    }
  }
  const badges = new Map<string, Exclude<CatchBadge, null>>();
  for (const row of bests.species) {
    for (const [best, kind] of [[row.heaviest, "weight"], [row.longest, "length"]] as const) {
      if (best && (rivals.get(`${best.species.trim().toLowerCase()}\u0000${kind}`) ?? 0) > 1) badges.set(best.id, "species");
    }
  }
  for (const best of [bests.heaviest, bests.longest]) if (best) badges.set(best.id, "book");
  cache.set(book, badges);
  return badges;
}

/** Whether this fish is the book's biggest, or the biggest of its kind, by the measure it was logged with. */
export function catchBadge(book: Logbook, entry: CatchEntry): CatchBadge {
  return bookBadges(book).get(entry.id) ?? null;
}
