import { FISH } from "./fish.ts";
import type { FishSpecies } from "./types.ts";

const DAY = 86_400_000;

/** One weekend's derby, Saturday 00:00 to Monday 00:00 UTC, the same window for the whole lodge. */
export type Derby = { from: string; to: string; fishId: string };

/** Fish a derby can name: anything but a legend, so every angler with the reach has a real shot. */
function derbyPool(): FishSpecies[] {
  return FISH.filter((fish) => fish.rarity !== "legendary").sort((a, b) => a.id.localeCompare(b.id));
}

function derbyAt(saturdayMs: number): Derby {
  const weeks = Math.round(saturdayMs / (7 * DAY));
  const s = Math.sin(weeks * 47.3 + 5.9) * 43758.5453;
  const pool = derbyPool();
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

/** Derbies that have ended, newest first, back to `since`. */
export function pastDerbies(since: Date, at: Date = new Date()): Derby[] {
  const derbies: Derby[] = [];
  for (let saturday = saturdayOnOrBefore(at); saturday + 2 * DAY > since.getTime(); saturday -= 7 * DAY) {
    const derby = derbyAt(saturday);
    if (Date.parse(derby.to) <= at.getTime()) derbies.push(derby);
  }
  return derbies;
}
