import { fishCountsByTrip, type Logbook, type Trip } from "@stillwater/shared";
import { countedBook } from "./milestones";
import { bookFishDay } from "./tripMonths";

/**
 * The fish each outing brought, with the angler's fish logged without an outing that day on that water, as a water's
 * page and Bests count them: so the cards, the month headings and the average all say the same day the same way.
 * A loose fish goes to the day's outing on its water only when there was one: of a dawn and a dusk, it is neither's
 * until filed, rather than both's. `onItsWater`: only the outing's fish on its own water, for the lines that set it
 * beside the water's other outings ("Last time here").
 */
export function outingFish(book: Logbook, onItsWater = false): (tripId: string) => number {
  const tripsById = new Map(book.trips.map((trip) => [trip.id, trip]));
  const fishByTrip = onItsWater ? new Map<string, number>() : fishCountsByTrip(book);
  if (onItsWater)
    for (const entry of book.catches)
      if (entry.tripId && tripsById.get(entry.tripId)?.spotId === entry.spotId) fishByTrip.set(entry.tripId, (fishByTrip.get(entry.tripId) ?? 0) + 1);
  const own = countedBook(book);
  const sameDay = new Map<string, number>();
  for (const trip of own.trips) sameDay.set(`${trip.date} ${trip.spotId}`, (sameDay.get(`${trip.date} ${trip.spotId}`) ?? 0) + 1);
  const loose = new Map<string, number>();
  for (const entry of own.catches) {
    if (entry.tripId) continue;
    const key = `${bookFishDay(own, entry)} ${entry.spotId}`;
    loose.set(key, (loose.get(key) ?? 0) + 1);
  }
  const tripOf = new Map(own.trips.map((trip) => [trip.id, trip]));
  return (id) => {
    const trip = tripOf.get(id);
    const key = trip ? `${trip.date} ${trip.spotId}` : "";
    return (fishByTrip.get(id) ?? 0) + (trip && sameDay.get(key) === 1 ? (loose.get(key) ?? 0) : 0);
  };
}

/** The days with fish the angler logged without an outing, as YYYY-MM-DD: each a fished day for a run of outings. */
/** Under way as Trips counts it (`fishOn` from `outingFish`): a fish, a lost one or a miss; a dawn and a dusk's loose fish is neither's. */
export function underWayOn(trip: Trip, fishOn: (tripId: string) => number): boolean {
  return fishOn(trip.id) > 0 || Boolean(trip.lost || trip.missed);
}

export function looseFishDays(book: Logbook): string[] {
  const own = countedBook(book);
  return [...new Set(own.catches.filter((entry) => !entry.tripId).map((entry) => bookFishDay(own, entry)))];
}
