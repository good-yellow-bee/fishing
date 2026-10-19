import { fishCountsByTrip, type Logbook } from "@stillwater/shared";
import { countedBook } from "./milestones";
import { bookFishDay } from "./tripMonths";

/**
 * The fish each outing brought, with the angler's fish logged without an outing that day on that water, as a water's
 * page and Bests count them: so the cards, the month headings and the average all say the same day the same way.
 */
export function outingFish(book: Logbook): (tripId: string) => number {
  const fishByTrip = fishCountsByTrip(book);
  const own = countedBook(book);
  const loose = new Map<string, number>();
  for (const entry of own.catches) {
    if (entry.tripId) continue;
    const key = `${bookFishDay(own, entry)} ${entry.spotId}`;
    loose.set(key, (loose.get(key) ?? 0) + 1);
  }
  const tripOf = new Map(own.trips.map((trip) => [trip.id, trip]));
  return (id) => {
    const trip = tripOf.get(id);
    return (fishByTrip.get(id) ?? 0) + (trip ? (loose.get(`${trip.date} ${trip.spotId}`) ?? 0) : 0);
  };
}

/** The days with fish the angler logged without an outing, as YYYY-MM-DD: each a fished day for a run of outings. */
export function looseFishDays(book: Logbook): string[] {
  const own = countedBook(book);
  return [...new Set(own.catches.filter((entry) => !entry.tripId).map((entry) => bookFishDay(own, entry)))];
}
