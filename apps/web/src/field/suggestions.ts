import { catchesNewestFirst, localDate, lureTally, personalBests, type CatchEntry, type Logbook, type Measure, type Trip } from "@stillwater/shared";
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

/** The weather on the newest fish of a day (YYYY-MM-DD, local) that noted it, for a fish with no outing weather to go by. */
export function dayWeather(book: Logbook, ymd: string, skipId?: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  return catchesNewestFirst(book).find((entry) => entry.id !== skipId && entry.weather && localDate(new Date(entry.caughtAt)) === ymd)?.weather ?? null;
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

/** The outing planned on this water for this day, which a fish caught there that day most likely belongs to. */
export function tripOnDay(book: Logbook, spotId: string, ymd: string): Trip | undefined {
  return book.trips.find((trip) => trip.spotId === spotId && trip.date === ymd);
}

/**
 * The longest and heaviest fish of the kind being typed, so the form can say what a new one has to beat.
 * `shown` turns a stored name into the words on screen; `skipId` leaves out the fish being edited.
 */
/** The book's fish of the kind typed, as stored or as it reads in the player's language, leaving out the one being edited. */
export function speciesCatches(
  book: Logbook,
  typed: string,
  shown: (name: string) => string = (name) => name,
  skipId?: string,
): CatchEntry[] {
  const want = typed.trim().toLowerCase();
  if (!want) return [];
  return book.catches.filter(
    (entry) => entry.id !== skipId && (entry.species.toLowerCase() === want || shown(entry.species).toLowerCase() === want),
  );
}

export function speciesBestSoFar(
  book: Logbook,
  typed: string,
  shown: (name: string) => string = (name) => name,
  skipId?: string,
): { longest: CatchEntry | null; heaviest: CatchEntry | null } | null {
  const catches = speciesCatches(book, typed, shown, skipId);
  if (catches.length === 0) return null;
  const { longest, heaviest } = personalBests({ ...book, catches });
  return { longest, heaviest };
}
