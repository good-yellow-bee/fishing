import type { Logbook } from "@stillwater/shared";
import { isSampleOnly, isSampleOuting } from "./bookCopy";
import { offPlayLake } from "./playLake";

const cache = new WeakMap<Logbook, Map<string, { first: string; last: string }>>();

/**
 * When the fish of each outing came, for the outings that share their water and day with another the angler sees (not
 * the game's rounds, not the sample week's beside their own): a dawn and a dusk tell apart by it. Worked out once per book.
 */
export function sameDayFishTimes(book: Logbook): ReadonlyMap<string, { first: string; last: string }> {
  const known = cache.get(book);
  if (known) return known;
  const sampleToo = isSampleOnly(book);
  const shown = book.trips.filter((trip) => offPlayLake(trip) && (sampleToo || !isSampleOuting(trip)));
  const perDay = new Map<string, number>();
  for (const trip of shown) perDay.set(`${trip.date} ${trip.spotId}`, (perDay.get(`${trip.date} ${trip.spotId}`) ?? 0) + 1);
  const twins = new Set(shown.filter((trip) => (perDay.get(`${trip.date} ${trip.spotId}`) ?? 0) > 1).map((trip) => trip.id));
  const times = new Map<string, { first: string; last: string }>();
  for (const entry of book.catches) {
    if (!entry.tripId || !twins.has(entry.tripId)) continue;
    const was = times.get(entry.tripId);
    times.set(entry.tripId, !was ? { first: entry.caughtAt, last: entry.caughtAt } : { first: entry.caughtAt < was.first ? entry.caughtAt : was.first, last: entry.caughtAt > was.last ? entry.caughtAt : was.last });
  }
  cache.set(book, times);
  return times;
}
