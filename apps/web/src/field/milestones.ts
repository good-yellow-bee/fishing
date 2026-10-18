import type { CatchEntry, Logbook } from "@stillwater/shared";
import { isSampleCatch, isSampleTrip } from "./bookCopy";
import { PLAY_LAKE_ID } from "./playLake";

/** A fish the angler caught: not the sample week, not the game. */
export const ownFish = (entry: CatchEntry) => !isSampleCatch(entry.id) && entry.spotId !== PLAY_LAKE_ID;

/**
 * The fish a "first" or "most" should be drawn from: never the game's, and the angler's own once there are any, so
 * a new book's sample week still shows how a line reads.
 */
export function countedFish(catches: readonly CatchEntry[]): CatchEntry[] {
  const real = catches.filter((entry) => entry.spotId !== PLAY_LAKE_ID);
  const own = real.filter((entry) => !isSampleCatch(entry.id));
  return own.length > 0 ? own : real;
}

/**
 * The book a year's count reads (the goal, days on the water, the year in text): the game's lake left out, and the
 * sample week once the angler has fish of their own (its outings once they have an outing or a fish).
 */
export function countedBook(book: Logbook): Logbook {
  const real = { ...book, trips: book.trips.filter((trip) => trip.spotId !== PLAY_LAKE_ID), catches: book.catches.filter((entry) => entry.spotId !== PLAY_LAKE_ID) };
  const own = real.catches.some((entry) => !isSampleCatch(entry.id)) || real.trips.some((trip) => !isSampleTrip(trip.id));
  // The fish exactly as Home counts them (countedFish); the sample's outings go with the first of the angler's own.
  return { ...real, trips: own ? real.trips.filter((trip) => !isSampleTrip(trip.id)) : real.trips, catches: countedFish(real.catches) };
}

/** Round counts worth a line: the 50th fish, the 100th, and so on. */
const BOOK_MARKS = [50, 100, 250, 500, 1000, 2500, 5000, 10000];
const KIND_MARKS = [10, 25, 50, 100, 250, 500, 1000];

/** The book's next round number when it is a few fish away (`within`), as the fish to go and the mark; else null. */
export function nextBookMark(count: number, within = 5): { left: number; mark: number } | null {
  const mark = BOOK_MARKS.find((each) => each > count);
  return mark !== undefined && mark - count <= within ? { left: mark - count, mark } : null;
}

export type Milestone = { of: "book"; n: number } | { of: "kind"; n: number };

export const byTime = (a: CatchEntry, b: CatchEntry) => a.caughtAt.localeCompare(b.caughtAt) || a.id.localeCompare(b.id);

/**
 * A round number this fish reached, by when it was caught: the 100th fish in the book, or the 10th of its kind,
 * or the first of a kind the book now holds more of. The book's mark wins when both land on one fish.
 */
export function milestoneOf(book: Logbook, entry: CatchEntry): Milestone | null {
  if (!ownFish(entry)) return null;
  const own = book.catches.filter(ownFish);
  const before = (other: CatchEntry) => byTime(other, entry) < 0;
  const inBook = own.filter(before).length + 1;
  if (BOOK_MARKS.includes(inBook)) return { of: "book", n: inBook };
  const kind = entry.species.trim().toLowerCase();
  const same = own.filter((other) => other.species.trim().toLowerCase() === kind);
  const inKind = same.filter(before).length + 1;
  // A lone fish of its kind is first by default: worth saying only once another has followed it.
  if (inKind === 1 && same.length > 1) return { of: "kind", n: 1 };
  return KIND_MARKS.includes(inKind) ? { of: "kind", n: inKind } : null;
}
