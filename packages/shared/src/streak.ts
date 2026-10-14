/** Days in a row with a fish that earn the Regular badge. */
export const REGULAR_DAYS = 7;

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

/** A calendar day written YYYY-MM-DD that exists on the calendar. */
export function isLocalDay(value: unknown): value is string {
  if (typeof value !== "string" || !DAY_PATTERN.test(value)) return false;
  const at = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(at) && new Date(at).toISOString().slice(0, 10) === value;
}

/** Whole days from `from` to `to`; both are YYYY-MM-DD, so time zones and daylight saving don't enter. */
export function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

/**
 * The angler's runs of consecutive days with a fish, from the local days their catches came in on.
 * `current` is the run ending today, or yesterday while today's first fish is still to come; a missed day
 * ends it, and nothing else is taken away.
 */
export function streakDays(days: readonly string[], today: string) {
  const sorted = [...new Set(days.filter(isLocalDay))].sort();
  let longest = 0;
  let run = 0;
  let previous: string | null = null;
  for (const day of sorted) {
    run = previous !== null && daysBetween(previous, day) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = day;
  }
  const gap = previous === null ? Infinity : daysBetween(previous, today);
  const current = gap === 0 || gap === 1 ? run : 0;
  return { current, longest };
}
