import { catchesNewestFirst, localDate, lureTally, type Logbook, type Measure, type Trip } from "@stillwater/shared";
import { isSampleCatch } from "./bookCopy";

/** The game files its fish here, always by weight, so they say nothing about how the player measures. */
const PLAY_LAKE_ID = "spot-stillwater";

/**
 * Names for a form's suggestion list: the player's own first, most used on
 * top, then the stock names they haven't used. One name never shows twice,
 * whatever its case. `shown` turns a stored name into the words on screen.
 */
export function ownFirst(own: readonly string[], stock: readonly string[], shown: (name: string) => string = (name) => name): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of [...own, ...stock]) {
    const words = shown(name).trim();
    const key = words.toLowerCase();
    if (!words || seen.has(key)) continue;
    seen.add(key);
    out.push(words);
  }
  return out;
}

/** The lures this book has taken fish on, most fish first. */
export function bookLures(book: Logbook, limit = 12) {
  return lureTally(book, limit).map((row) => row.lure);
}

/** The lure of the newest fish on a trip, so the next fish logged there starts with it. */
export function tripLure(book: Logbook, tripId: string | undefined) {
  if (!tripId) return "";
  return catchesNewestFirst(book).find((entry) => entry.tripId === tripId)?.lure ?? "";
}

/** The weather on the newest fish of a trip that noted it, so the next fish there can take it in one tap. */
export function tripWeather(book: Logbook, tripId: string | undefined, skipId?: string) {
  if (!tripId) return null;
  return catchesNewestFirst(book).find((entry) => entry.tripId === tripId && entry.id !== skipId && entry.weather)?.weather ?? null;
}

/** Length or weight, as the player measured their newest fish by hand; length for a book with none yet. */
export function lastMeasureKind(book: Logbook): Measure["kind"] {
  const own = catchesNewestFirst(book).find((entry) => !isSampleCatch(entry.id) && entry.spotId !== PLAY_LAKE_ID);
  return own?.measure.kind ?? "length";
}

/** Whether the player's newest own fish went back, so a catch-and-release angler starts each new one ticked. */
export function lastReleased(book: Logbook): boolean {
  const own = catchesNewestFirst(book).find((entry) => !isSampleCatch(entry.id) && entry.spotId !== PLAY_LAKE_ID);
  return own?.released === true;
}

/**
 * When a new catch starts: now, unless it is logged for an outing on an earlier day.
 * Then it starts on that day at this clock time, so it lands on the outing's date.
 */
export function startTimeFor(trip: Pick<Trip, "date"> | undefined, now: Date = new Date()): Date {
  if (!trip || trip.date >= localDate(now)) return now;
  const [y, m, d] = trip.date.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d, now.getHours(), now.getMinutes());
}
