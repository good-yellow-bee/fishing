import { catchesNewestFirst, localDate, lureTally, measureOf, personalBests, type CatchEntry, type CatchWeather, type Logbook, type Measure, type Trip } from "@stillwater/shared";
import { isSampleCatch } from "./bookCopy";
import { PLAY_LAKE_ID } from "./playLake";

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

/**
 * The weather on the newest fish of a day (YYYY-MM-DD, local) that noted it, for a fish with no outing weather to go by.
 * The sky and wind hold across waters that day; the water temperature only comes along from a fish on `spotId` itself.
 */
export function dayWeather(book: Logbook, ymd: string, skipId?: string, spotId?: string): CatchWeather | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const day = catchesNewestFirst(book).filter((entry) => entry.id !== skipId && entry.weather && localDate(new Date(entry.caughtAt)) === ymd);
  if (spotId === undefined) return day[0]?.weather ?? null;
  const here = day.find((entry) => entry.spotId === spotId);
  if (here || !day[0]) return here?.weather ?? null;
  const { waterTempF: _elsewhere, ...rest } = day[0].weather!;
  return rest;
}

/** Length or weight, as the player measured their newest fish by hand; length for a book with none yet. */
export function lastMeasureKind(book: Logbook): Measure["kind"] {
  const own = catchesNewestFirst(book).find((entry) => !isSampleCatch(entry.id) && entry.spotId !== PLAY_LAKE_ID);
  return own?.measure.kind ?? "length";
}

/** Length or weight, as the player measured their newest own fish of the kind typed; null when they have none of it yet. */
export function kindMeasure(book: Logbook, typed: string, shown: (name: string) => string = (name) => name): Measure["kind"] | null {
  const own = speciesCatches(book, typed, shown).filter((entry) => !isSampleCatch(entry.id) && entry.spotId !== PLAY_LAKE_ID);
  const newest = own.reduce<CatchEntry | null>((best, entry) => (!best || entry.caughtAt > best.caughtAt ? entry : best), null);
  return newest?.measure.kind ?? null;
}

/** Whether the player's newest own fish went back, so a catch-and-release angler starts each new one ticked. */
export function lastReleased(book: Logbook): boolean {
  const own = catchesNewestFirst(book).find((entry) => !isSampleCatch(entry.id) && entry.spotId !== PLAY_LAKE_ID);
  return own?.released === true;
}

/**
 * When a new catch starts: now, unless it is logged for an outing on an earlier day.
 * Then it starts on that day at this clock time, so it lands on the outing's date. Last night's outing in the small
 * hours keeps now: the fish came after midnight.
 */
export function startTimeFor(trip: Pick<Trip, "date"> | undefined, now: Date = new Date()): Date {
  if (!trip || trip.date >= localDate(now)) return now;
  if (now.getHours() < LATE_NIGHT_UNTIL && trip.date === localDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12))) return now;
  const [y, m, d] = trip.date.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d, now.getHours(), now.getMinutes());
}

/** The outing planned on this water for this day, which a fish caught there that day most likely belongs to. */
export function tripOnDay(book: Logbook, spotId: string, ymd: string): Trip | undefined {
  return book.trips.find((trip) => trip.spotId === spotId && trip.date === ymd);
}

/** Before this hour a fish with no outing on its own day still belongs to the night before's. */
export const LATE_NIGHT_UNTIL = 4;

/**
 * Whether a fish caught at this local time (YYYY-MM-DDTHH:MM) on this water belongs to an outing on `ymd`: caught that
 * day, or in the small hours after it with no outing of its own day there.
 */
export function fishOnOutingDay(book: Logbook, spotId: string, local: string, ymd: string): boolean {
  if (local.slice(0, 10) === ymd) return true;
  const hour = Number(local.slice(11, 13));
  if (local.length < 13 || !(hour < LATE_NIGHT_UNTIL)) return false;
  const [y, m, d] = local.slice(0, 10).split("-").map(Number) as [number, number, number];
  return localDate(new Date(y, m - 1, d - 1, 12)) === ymd && !tripOnDay(book, spotId, local.slice(0, 10));
}

/**
 * The outing a fish caught at this local time (YYYY-MM-DDTHH:MM) on this water most likely belongs to: that day's, or,
 * in the small hours with none that day, the outing of the evening before.
 */
export function tripForFish(book: Logbook, spotId: string, local: string): Trip | undefined {
  const ymd = local.slice(0, 10);
  const sameDay = tripOnDay(book, spotId, ymd);
  if (sameDay) return sameDay;
  const hour = Number(local.slice(11, 13));
  if (local.length < 13 || !(hour < LATE_NIGHT_UNTIL)) return undefined;
  const [y, m, d] = ymd.split("-").map(Number) as [number, number, number];
  return tripOnDay(book, spotId, localDate(new Date(y, m - 1, d - 1, 12)));
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

/**
 * A size this many times the kind's best so far is more likely a slip than a new record. Weight grows with about the
 * cube of length, so a fish a third longer than the best is more than twice as heavy: weights get room for that.
 */
export const FAR_PAST_BEST: Record<Measure["kind"], number> = { length: 2, weight: 4 };

/**
 * True when `amount` (inches or pounds, by `kind`) is more than FAR_PAST_BEST times this kind's best of that measure,
 * and `asOther` (the same typed number read as the other measure) would sit no further past that one's best: "41" for
 * a 41-inch pike typed as pounds.
 */
export function looksLikeOtherMeasure(
  best: { longest: CatchEntry | null; heaviest: CatchEntry | null } | null,
  kind: Measure["kind"],
  amount: number,
  asOther: number,
): boolean {
  if (!best || !(amount > 0)) return false;
  const size = (entry: CatchEntry | null, of: Measure["kind"]) => {
    const measure = entry ? measureOf(entry, of) : null;
    return measure ? (measure.kind === "length" ? measure.inches : measure.pounds) : null;
  };
  const same = size(kind === "length" ? best.longest : best.heaviest, kind);
  if (same === null || amount <= same * FAR_PAST_BEST[kind]) return false;
  const otherKind = kind === "length" ? "weight" : "length";
  const other = size(kind === "length" ? best.heaviest : best.longest, otherKind);
  return other === null || asOther <= other * FAR_PAST_BEST[otherKind];
}


/** This kind's best of the measure typed, when `amount` is more than FAR_PAST_BEST times it: likely a slip of the unit. */
export function farPastBest(best: { longest: CatchEntry | null; heaviest: CatchEntry | null } | null, kind: Measure["kind"], amount: number): Measure | null {
  const entry = kind === "length" ? best?.longest : best?.heaviest;
  const measure = entry ? measureOf(entry, kind) : null;
  if (!measure || !(amount > 0)) return null;
  const size = measure.kind === "length" ? measure.inches : measure.pounds;
  return amount > size * FAR_PAST_BEST[kind] ? measure : null;
}

/** How many letters to add, drop or change to turn one name into the other. */
function editDistance(a: string, b: string): number {
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) next[j] = Math.min(row[j]! + 1, next[j - 1]! + 1, row[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    row = next;
  }
  return row[b.length]!;
}

/**
 * The name a typed species is most likely a slip of ("Nothern pike" for "Northern pike"): one or two letters off,
 * by its length. Null for a name already known, one too short to judge, or nothing close.
 */
export function closeSpecies(typed: string, names: readonly string[]): string | null {
  const want = typed.trim().toLowerCase();
  if (want.length < 4 || names.some((name) => name.toLowerCase() === want)) return null;
  const most = want.length >= 8 ? 2 : 1;
  let found: { name: string; distance: number } | null = null;
  for (const name of names) {
    // "Jig 9g" beside "Jig 5g" is another size, not a slip.
    if (want.replace(/\d/g, "") === name.toLowerCase().replace(/\d/g, "")) continue;
    const distance = editDistance(want, name.toLowerCase());
    if (distance <= most && (!found || distance < found.distance)) found = { name, distance };
  }
  return found?.name ?? null;
}

/**
 * Lure names a letter or two apart ("Spiner" and "Spinner"), each folded into the one that took more fish: most likely
 * one lure typed two ways. Each name shows up in one pair at most.
 */
export function nearTwinLures(
  tally: readonly { lure: string; count: number }[],
  keptApart: (a: string, b: string) => boolean = () => false,
): { from: string; into: string }[] {
  const pairs: { from: string; into: string }[] = [];
  const taken = new Set<string>();
  // Most fish first, so the name kept is the one used most.
  const rows = [...tally].sort((a, b) => b.count - a.count);
  for (const [i, into] of rows.entries()) {
    if (taken.has(into.lure)) continue;
    for (const from of rows.slice(i + 1)) {
      if (taken.has(from.lure) || closeSpecies(from.lure, [into.lure]) !== into.lure || jigOrRig(from.lure, into.lure) || keptApart(from.lure, into.lure)) continue;
      pairs.push({ from: from.lure, into: into.lure });
      taken.add(from.lure).add(into.lure);
      break;
    }
  }
  return pairs;
}

/** "Hair jig" and "Hair rig": a word apart that names two kinds of tackle, not a slip. */
function jigOrRig(a: string, b: string): boolean {
  const swap = (name: string) => name.toLowerCase().replace(/\b(jig|rig)\b/g, "#");
  return swap(a) === swap(b) && a.toLowerCase() !== b.toLowerCase();
}
