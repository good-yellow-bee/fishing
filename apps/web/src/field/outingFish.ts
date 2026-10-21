import { fishCountsByTrip, type CatchEntry, type Logbook, type Trip } from "@stillwater/shared";
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
  const loose = looseFishByOuting(book);
  return (id) => (fishByTrip.get(id) ?? 0) + (loose.get(id)?.length ?? 0);
}

/** The fish each outing brought, by `outingFish`'s rule: its own, with the loose ones it takes. */
export function outingCatches(book: Logbook): (tripId: string) => CatchEntry[] {
  const filed = new Map<string, CatchEntry[]>();
  for (const entry of book.catches) if (entry.tripId) listUnder(filed, entry.tripId, entry);
  const loose = looseFishByOuting(book);
  return (id) => [...(filed.get(id) ?? []), ...(loose.get(id) ?? [])];
}

/** The angler's fish logged without an outing, by the outing they go to: the day's only one on their water. */
function looseFishByOuting(book: Logbook): Map<string, CatchEntry[]> {
  const own = countedBook(book);
  const onDay = new Map<string, Trip[]>();
  for (const trip of own.trips) listUnder(onDay, `${trip.date} ${trip.spotId}`, trip);
  const byOuting = new Map<string, CatchEntry[]>();
  for (const entry of own.catches) {
    if (entry.tripId) continue;
    const trips = onDay.get(`${bookFishDay(own, entry)} ${entry.spotId}`);
    if (trips?.length === 1) listUnder(byOuting, trips[0].id, entry);
  }
  return byOuting;
}

function listUnder<T>(lists: Map<string, T[]>, key: string, item: T): void {
  const list = lists.get(key);
  if (list) list.push(item);
  else lists.set(key, [item]);
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
