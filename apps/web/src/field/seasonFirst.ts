import { localDate, type CatchEntry } from "@stillwater/shared";

/** The day a fish counts on: its own clock day unless the caller files a night session's small hours under its outing's. */
type DayOf = (entry: CatchEntry) => string;
const clockDay: DayOf = (entry) => localDate(new Date(entry.caughtAt));

/** The day of `year` with this day's month and day ("2025-04-03"), so 3 April is the same day whichever year it fell in (29 February rolls to 1 March). */
function calendarDay(day: string, year: number): number {
  return Math.round((Date.UTC(year, Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10))) - Date.UTC(year, 0, 1)) / 86_400_000);
}

/**
 * This year's first fish against last year's first: how many days earlier (positive) or later (negative) the kind
 * showed up. Null unless both years have a fish; a kind not seen this year has no first to compare.
 */
export function seasonFirst(
  catches: readonly CatchEntry[],
  today: Date = new Date(),
  dayOf: DayOf = clockDay,
): { entry: CatchEntry; year: number; earlier: number } | null {
  const firsts = new Map<number, { entry: CatchEntry; day: string }>();
  for (const entry of catches) {
    if (Number.isNaN(Date.parse(entry.caughtAt))) continue;
    const day = dayOf(entry);
    const year = Number(day.slice(0, 4));
    const held = firsts.get(year);
    if (!held || day < held.day || (day === held.day && entry.caughtAt < held.entry.caughtAt)) firsts.set(year, { entry, day });
  }
  const year = today.getFullYear();
  const now = firsts.get(year);
  const before = firsts.get(year - 1);
  if (!now || !before) return null;
  return { entry: now.entry, year, earlier: calendarDay(before.day, year) - calendarDay(now.day, year) };
}

/** Last year's last fish of the kind, to say when its season ended then; null when last year gave none. */
export function seasonLast(catches: readonly CatchEntry[], today: Date = new Date(), dayOf: DayOf = clockDay): CatchEntry | null {
  const year = String(today.getFullYear() - 1);
  let last: CatchEntry | null = null;
  for (const entry of catches) {
    if (Number.isNaN(Date.parse(entry.caughtAt)) || !dayOf(entry).startsWith(`${year}-`)) continue;
    if (!last || entry.caughtAt > last.caughtAt) last = entry;
  }
  return last;
}
