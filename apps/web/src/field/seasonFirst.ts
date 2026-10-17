import type { CatchEntry } from "@stillwater/shared";

/** The day of the year in one fixed leap year, so 3 April is the same day whichever year it fell in. */
function calendarDay(at: Date): number {
  return Math.round((Date.UTC(2000, at.getMonth(), at.getDate()) - Date.UTC(2000, 0, 1)) / 86_400_000);
}

/**
 * The first fish of the newest year against the year before's first: how many days earlier (positive) or later
 * (negative) the kind showed up. Null unless both years have a fish.
 */
export function seasonFirst(catches: readonly CatchEntry[]): { entry: CatchEntry; year: number; earlier: number } | null {
  const firsts = new Map<number, { entry: CatchEntry; at: Date }>();
  for (const entry of catches) {
    const at = new Date(entry.caughtAt);
    if (Number.isNaN(at.getTime())) continue;
    const held = firsts.get(at.getFullYear());
    if (!held || at < held.at) firsts.set(at.getFullYear(), { entry, at });
  }
  const year = Math.max(...firsts.keys());
  const now = firsts.get(year);
  const before = firsts.get(year - 1);
  if (!now || !before) return null;
  return { entry: now.entry, year, earlier: calendarDay(before.at) - calendarDay(now.at) };
}
