import type { CatchEntry } from "@stillwater/shared";

const DAY_MS = 24 * 60 * 60 * 1000;

/** The local calendar day as a whole number of days, the same whatever the hour. */
function dayNumber(date: Date): number {
  return Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);
}

/** How many years back from `now` the fish came within `days` of the same date, or null: a fish from 30 December is a year ago on 1 January, not two. */
export function yearsBack(entry: CatchEntry, now: Date = new Date(), days = 3): number | null {
  const at = new Date(entry.caughtAt);
  if (Number.isNaN(at.getTime())) return null;
  const gap = now.getFullYear() - at.getFullYear();
  // The same date in the fish's own year, or in the year either side of it when the week runs across New Year.
  for (const years of [gap, gap - 1, gap + 1]) {
    if (years < 1) continue;
    const then = new Date(now);
    then.setFullYear(now.getFullYear() - years);
    // By calendar day, so a fish stays in the week all day rather than dropping out at the hour it was caught.
    if (Math.abs(dayNumber(at) - dayNumber(then)) <= days) return years;
  }
  return null;
}

/** How far either side of a planned day "this time of year" reaches in earlier years: a fortnight, as fish keep to a season, not a week. */
export const SAME_TIME_DAYS = 14;

/** Fish from earlier years caught within `days` of today's date in their own year, newest first: this week, years ago. */
export function thisWeekInPastYears(catches: readonly CatchEntry[], now: Date = new Date(), days = 3, limit = 3): CatchEntry[] {
  const found = catches.filter((entry) => yearsBack(entry, now, days) !== null);
  return found.sort((a, b) => b.caughtAt.localeCompare(a.caughtAt)).slice(0, limit);
}
