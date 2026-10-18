import type { CatchEntry } from "@stillwater/shared";

/** The day of `year` with this date's month and day, so 3 April is the same day whichever year it fell in (29 February rolls to 1 March). */
function calendarDay(at: Date, year: number): number {
  return Math.round((Date.UTC(year, at.getMonth(), at.getDate()) - Date.UTC(year, 0, 1)) / 86_400_000);
}

/**
 * This year's first fish against last year's first: how many days earlier (positive) or later (negative) the kind
 * showed up. Null unless both years have a fish; a kind not seen this year has no first to compare.
 */
export function seasonFirst(catches: readonly CatchEntry[], today: Date = new Date()): { entry: CatchEntry; year: number; earlier: number } | null {
  const firsts = new Map<number, { entry: CatchEntry; at: Date }>();
  for (const entry of catches) {
    const at = new Date(entry.caughtAt);
    if (Number.isNaN(at.getTime())) continue;
    const held = firsts.get(at.getFullYear());
    if (!held || at < held.at) firsts.set(at.getFullYear(), { entry, at });
  }
  const year = today.getFullYear();
  const now = firsts.get(year);
  const before = firsts.get(year - 1);
  if (!now || !before) return null;
  return { entry: now.entry, year, earlier: calendarDay(before.at, year) - calendarDay(now.at, year) };
}

/** Last year's last fish of the kind, to say when its season ended then; null when last year gave none. */
export function seasonLast(catches: readonly CatchEntry[], today: Date = new Date()): CatchEntry | null {
  const year = today.getFullYear() - 1;
  let last: CatchEntry | null = null;
  for (const entry of catches) {
    const at = new Date(entry.caughtAt);
    if (Number.isNaN(at.getTime()) || at.getFullYear() !== year) continue;
    if (!last || entry.caughtAt > last.caughtAt) last = entry;
  }
  return last;
}
