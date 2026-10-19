import { foldText, localDate, type CatchEntry, type Logbook, type Spot } from "@stillwater/shared";
import { PLAY_LAKE_ID } from "./playLake";
import { bookFishDay } from "./tripMonths";
import { countedFish, ownFish } from "./milestones";
import { isSampleSpot, isSampleOuting } from "./bookCopy";

/** A water's name as a search reads it: "Śniardwy" and "sniardwy " are one name, so their links open both waters' fish. */
export function foldName(name: string): string {
  return foldText(name.trim().replace(/\s+/g, " ")).toLowerCase();
}

/** Two waters a search can't tell apart by name. */
export function twinName(a: string, b: string): boolean {
  return foldName(a) === foldName(b);
}

/** `lastFishDay`: the day the newest fish counts on, a night session's small hours on its outing's, as the calendar has it. */
export type SpotRow = { spot: Spot; fishCount: number; lastFishAt: string | null; lastFishDay: string | null };

/** Waters fished most recently first; waters with no fish yet keep the book's order after them. */
export function spotsByLastFish(book: Logbook): SpotRow[] {
  // One pass over the fish for every water, rather than sorting the whole book once per water.
  const tally = new Map<string, { fishCount: number; last: CatchEntry }>();
  for (const entry of book.catches) {
    const row = tally.get(entry.spotId);
    if (!row) tally.set(entry.spotId, { fishCount: 1, last: entry });
    else {
      row.fishCount += 1;
      if (entry.caughtAt > row.last.caughtAt) row.last = entry;
    }
  }
  const rows = book.spots.map((spot, index) => {
    const row = tally.get(spot.id);
    return { spot, fishCount: row?.fishCount ?? 0, lastFishAt: row?.last.caughtAt ?? null, lastFishDay: row ? bookFishDay(book, row.last) : null, index };
  });
  rows.sort((a, b) => {
    if (a.lastFishAt && b.lastFishAt) return b.lastFishAt.localeCompare(a.lastFishAt) || a.index - b.index;
    if (a.lastFishAt) return -1;
    if (b.lastFishAt) return 1;
    return a.index - b.index;
  });
  return rows.map(({ index: _index, ...row }) => row);
}

/**
 * The water a new fish most likely came from: today's outing's water, or of several outings today the one fished
 * most recently; with none today, the water fished most recently; else the book's first. Never the game's lake.
 * `smallHours`: before dawn, when last night's outing counts as today's.
 */
export function likelyWater(book: Logbook, today: string, smallHours = false): string {
  // Never the game's lake: a fish logged by hand came from a real water. Ranked by the angler's own fish, so a sample
  // week dated after their first real fish doesn't pull a new fish onto a made-up water.
  const order = spotsByLastFish({ ...book, catches: countedFish(book.catches) }).map((row) => row.spot.id).filter((id) => id !== PLAY_LAKE_ID);
  // In the small hours, last night's outing is still the one on the water.
  const [y, m, d] = today.split("-").map(Number) as [number, number, number];
  const yesterday = smallHours ? localDate(new Date(y, m - 1, d - 1, 12)) : today;
  const todays = new Set(book.trips.filter((trip) => (trip.date === today || trip.date === yesterday) && !isSampleOuting(trip)).map((trip) => trip.spotId));
  // No fish of the angler's own yet: their first water of their own, not one from the sample week.
  const noOwn = !book.catches.some(ownFish);
  const own = noOwn ? book.spots.find((spot) => spot.id !== PLAY_LAKE_ID && !isSampleSpot(spot.id))?.id : undefined;
  return order.find((id) => todays.has(id)) ?? own ?? order[0] ?? "";
}

const EARTH_KM = 6371;

/** Kilometres between two points on the map, along the ground. */
export function kmBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** The water with a pin nearest to where the player stands, and how far it is; null when no water has a pin. */
export function nearestWater(book: Logbook, here: { lat: number; lng: number }): { spot: Spot; km: number } | null {
  let best: { spot: Spot; km: number } | null = null;
  for (const spot of book.spots) {
    if (!spot.place || spot.id === PLAY_LAKE_ID) continue;
    const km = kmBetween(here, spot.place);
    if (!best || km < best.km) best = { spot, km };
  }
  return best;
}

/** The last day each water was fished, by an outing before today or a fish logged there, whichever is later; not the game's lake. */
export function lastOutByWater(book: Logbook, today: string): Map<string, string> {
  const last = new Map<string, string>();
  const note = (spotId: string, day: string) => {
    if (day <= today && day > (last.get(spotId) ?? "")) last.set(spotId, day);
  };
  // Today's outing counts once it has a fish, which the fish below already says.
  for (const trip of book.trips) if (trip.date < today && trip.spotId !== PLAY_LAKE_ID) note(trip.spotId, trip.date);
  // A night's small-hours fish on its outing's day, as the rest of the book dates it.
  for (const entry of book.catches) if (entry.spotId !== PLAY_LAKE_ID) note(entry.spotId, bookFishDay(book, entry));
  return last;
}

/** Whole days from one day to a later one. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}
