import type { CatchEntry, Logbook } from "@stillwater/shared";

/** Round counts worth a line: the 50th fish, the 100th, and so on. */
const BOOK_MARKS = [50, 100, 250, 500, 1000, 2500, 5000, 10000];
const KIND_MARKS = [10, 25, 50, 100, 250, 500, 1000];

export type Milestone = { of: "book"; n: number } | { of: "kind"; n: number };

const byTime = (a: CatchEntry, b: CatchEntry) => a.caughtAt.localeCompare(b.caughtAt) || a.id.localeCompare(b.id);

/**
 * A round number this fish reached, by when it was caught: the 100th fish in the book, or the 10th of its kind,
 * or the first of a kind the book now holds more of. The book's mark wins when both land on one fish.
 */
export function milestoneOf(book: Logbook, entry: CatchEntry): Milestone | null {
  const before = (other: CatchEntry) => byTime(other, entry) < 0;
  const inBook = book.catches.filter(before).length + 1;
  if (BOOK_MARKS.includes(inBook)) return { of: "book", n: inBook };
  const kind = entry.species.trim().toLowerCase();
  const same = book.catches.filter((other) => other.species.trim().toLowerCase() === kind);
  const inKind = same.filter(before).length + 1;
  // A lone fish of its kind is first by default: worth saying only once another has followed it.
  if (inKind === 1 && same.length > 1) return { of: "kind", n: 1 };
  return KIND_MARKS.includes(inKind) ? { of: "kind", n: inKind } : null;
}
