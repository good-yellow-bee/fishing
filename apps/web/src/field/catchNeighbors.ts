import { catchesNewestFirst, localDate, type CatchEntry, type Logbook, type Trip } from "@stillwater/shared";
import { isSampleOnly, isSampleOuting } from "./bookCopy";
import { PLAY_LAKE_ID } from "./playLake";

export type Neighbors<T> = { newer: T | null; older: T | null };

/** The rows either side of `id` in a list already newest first. */
export function neighborsIn<T extends { id: string }>(rows: readonly T[], id: string): Neighbors<T> {
  const at = rows.findIndex((row) => row.id === id);
  if (at < 0) return { newer: null, older: null };
  return { newer: rows[at - 1] ?? null, older: rows[at + 1] ?? null };
}

/** The fish either side, newest first: a game fish steps among game fish, a real one among real ones. */
export function catchNeighbors(book: Logbook, id: string): Neighbors<CatchEntry> {
  const play = book.catches.find((entry) => entry.id === id)?.spotId === PLAY_LAKE_ID;
  return neighborsIn(catchesNewestFirst(book).filter((entry) => (entry.spotId === PLAY_LAKE_ID) === play), id);
}

/**
 * The outings either side, by day: game days step only among themselves, real ones among real ones. Once the book
 * holds the angler's own, the sample week's plans still ahead are hidden, as Coming up hides them, unless one is shown.
 */
export function tripNeighbors(book: Logbook, id: string, today = localDate(new Date())): Neighbors<Trip> {
  const self = book.trips.find((trip) => trip.id === id);
  const play = self?.spotId === PLAY_LAKE_ID;
  const hideSamplePlans = !isSampleOnly(book) && !(self && isSampleOuting(self));
  // Two outings on one day go by their first fish (a dawn before a dusk), where both have one.
  const firstFish = new Map<string, string>();
  for (const entry of book.catches) if (entry.tripId && entry.caughtAt < (firstFish.get(entry.tripId) ?? "~")) firstFish.set(entry.tripId, entry.caughtAt);
  const byFish = (a: Trip, b: Trip) => {
    const x = firstFish.get(a.id);
    const y = firstFish.get(b.id);
    return x && y ? y.localeCompare(x) : 0;
  };
  const rows = book.trips
    .filter((trip) => (trip.spotId === PLAY_LAKE_ID) === play && !(hideSamplePlans && isSampleOuting(trip) && trip.date >= today))
    .sort((a, b) => b.date.localeCompare(a.date) || byFish(a, b) || a.id.localeCompare(b.id));
  return neighborsIn(rows, id);
}
