import { personalBests, type CatchEntry, type Logbook } from "@stillwater/shared";

export type CatchBadge = "book" | "species" | null;

const cache = new WeakMap<Logbook, Map<string, Exclude<CatchBadge, null>>>();

/** Every badged fish in the book, worked out once per book. */
export function bookBadges(book: Logbook): Map<string, Exclude<CatchBadge, null>> {
  const known = cache.get(book);
  if (known) return known;
  const bests = personalBests(book);
  const rivals = new Map<string, number>();
  for (const entry of book.catches) {
    const key = `${entry.species.trim().toLowerCase()}\u0000${entry.measure.kind}`;
    rivals.set(key, (rivals.get(key) ?? 0) + 1);
  }
  const badges = new Map<string, Exclude<CatchBadge, null>>();
  for (const row of bests.species) {
    for (const best of [row.heaviest, row.longest]) {
      if (best && (rivals.get(`${best.species.trim().toLowerCase()}\u0000${best.measure.kind}`) ?? 0) > 1) badges.set(best.id, "species");
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
