import type { CatchEntry } from "@stillwater/shared";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Fish from earlier years caught within `days` of today's date in their own year, newest first: this week, years ago. */
export function thisWeekInPastYears(catches: readonly CatchEntry[], now: Date = new Date(), days = 3, limit = 3): CatchEntry[] {
  const found: CatchEntry[] = [];
  for (const entry of catches) {
    const at = new Date(entry.caughtAt);
    if (Number.isNaN(at.getTime()) || at.getFullYear() >= now.getFullYear()) continue;
    const then = new Date(now);
    then.setFullYear(at.getFullYear());
    if (Math.abs(at.getTime() - then.getTime()) <= days * DAY_MS) found.push(entry);
  }
  return found.sort((a, b) => b.caughtAt.localeCompare(a.caughtAt)).slice(0, limit);
}
