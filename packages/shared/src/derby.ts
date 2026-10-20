import { weeklyFishPool, seasonForWeek } from "./weeklyFish.ts";

const DAY = 86_400_000;

/** One weekend's derby, Saturday 00:00 to Monday 00:00 UTC, the same window for the whole lodge. */
export type Derby = { from: string; to: string; fishId: string };

/** The first weekend derby: wins are counted from it, not from weekends before anyone raced. */
export const DERBY_START = "2026-10-24T00:00:00.000Z";

function derbyAt(saturdayMs: number): Derby {
  const weeks = Math.round(saturdayMs / (7 * DAY));
  const s = Math.sin(weeks * 47.3 + 5.9) * 43758.5453;
  // The season's runners, like the fish of the week, so most anglers have a real shot.
  const pool = weeklyFishPool(seasonForWeek(new Date(saturdayMs - 5 * DAY)));
  return { from: new Date(saturdayMs).toISOString(), to: new Date(saturdayMs + 2 * DAY).toISOString(), fishId: pool[Math.floor((s - Math.floor(s)) * 1_000_000) % pool.length]!.id };
}

/** The Saturday 00:00 UTC on or before `at`. */
function saturdayOnOrBefore(at: Date): number {
  const back = (at.getUTCDay() + 1) % 7;
  return Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate() - back);
}

/** The derby running at `at`, or null on a weekday. */
export function derbyOn(at: Date = new Date()): Derby | null {
  const derby = derbyAt(saturdayOnOrBefore(at));
  return at.getTime() < Date.parse(derby.to) ? derby : null;
}

/** The next derby to start after `at`, for a weekday's board. */
export function nextDerby(at: Date = new Date()): Derby {
  return derbyAt(saturdayOnOrBefore(at) + 7 * DAY);
}

/** The last derby to have ended by `at`, or null before the first. */
export function lastDerby(at: Date = new Date()): Derby | null {
  const current = derbyAt(saturdayOnOrBefore(at));
  const last = at.getTime() >= Date.parse(current.to) ? current : derbyAt(saturdayOnOrBefore(at) - 7 * DAY);
  return last.from >= DERBY_START ? last : null;
}

/** Derbies that have ended, newest first, back to `since` but never before DERBY_START. */
export function pastDerbies(since: Date, at: Date = new Date()): Derby[] {
  const derbies: Derby[] = [];
  const from = Math.max(since.getTime(), Date.parse(DERBY_START));
  for (let saturday = saturdayOnOrBefore(at); saturday + 2 * DAY > from; saturday -= 7 * DAY) {
    const derby = derbyAt(saturday);
    if (Date.parse(derby.to) <= at.getTime()) derbies.push(derby);
  }
  return derbies;
}
