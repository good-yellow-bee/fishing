import { WATER_LABELS, foldText, spotById, type Logbook, type Trip } from "@stillwater/shared";
import { dateWords } from "./dateWords";

/** Words that ask for the outings already fished that landed nothing. */
const NO_FISH = ["no fish", "blank", "bez ryb", "bez ryby", "pusty", "puste"];

/** Lower case with single spaces, so typed words compare however they were spaced. */
const plain = foldText;

// Made once: a book of hundreds of outings writes each day out on every key typed.
const DAY_FORMATS = ["en", "pl"].flatMap((lang) => [
  new Intl.DateTimeFormat(lang, { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
  new Intl.DateTimeFormat(lang, { month: "long" }),
]);

/** Each outing's searchable text, worked out once per book and language. */
const textCache = new WeakMap<Logbook, Map<string, string>>();

/** Everything an outing can be found by: its title, note, water and kind of water, and its day written out. */
function tripText(book: Logbook, trip: Trip, t: (text: string) => string): string {
  const key = `${t(WATER_LABELS.lake)}\u0000${trip.id}`;
  let known = textCache.get(book);
  if (!known) textCache.set(book, (known = new Map()));
  const kept = known.get(key);
  if (kept !== undefined) return kept;
  const text = writeTripText(book, trip, t);
  known.set(key, text);
  return text;
}

function writeTripText(book: Logbook, trip: Trip, t: (text: string) => string): string {
  const spot = spotById(book, trip.spotId);
  const [y, m, d] = trip.date.split("-").map(Number) as [number, number, number];
  const day = new Date(y, m - 1, d, 12);
  // The month on its own too: Polish writes it differently beside a day ("września") than alone ("wrzesień").
  const written = DAY_FORMATS.map((format) => format.format(day));
  return plain([trip.title, trip.note, spot?.name ?? "", spot ? t(WATER_LABELS[spot.waterType]) : "", trip.date, ...written].join(" \n "));
}

/**
 * The outings a search names, newest first. Parts joined with "+" must all hold; each part is a date word ("last
 * week", "Oct 12"), "no fish" for a past outing that landed nothing, or words that all appear in the outing's title,
 * note, water or written-out day ("october", "cedar dawn").
 */
export function findTrips(book: Logbook, needle: string, fishOn: (tripId: string) => number, today: string, t: (text: string) => string, now = new Date()): Trip[] {
  const parts = needle.split("+").map(plain).filter(Boolean);
  if (parts.length === 0) return [];
  // Each part's dates read once, not once per outing.
  const ranges = new Map(parts.map((part) => [part, dateWords(part, now)]));
  const matches = (trip: Trip, text: string, part: string) => {
    if (NO_FISH.includes(part)) return trip.date < today && fishOn(trip.id) === 0;
    const range = ranges.get(part);
    if (range) return trip.date >= range.from && trip.date <= range.to;
    return part.split(" ").every((word) => text.includes(word));
  };
  return book.trips
    .filter((trip) => {
      const text = tripText(book, trip, t);
      return parts.every((part) => matches(trip, text, part));
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}
