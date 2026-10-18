import { WATER_LABELS, foldText, spotById, type CatchEntry, type Logbook, type Trip } from "@stillwater/shared";
import { dateWords, monthWord } from "./dateWords";
import { singularStems } from "./pluralWord";
import { readSizePlus } from "./sizePlus";
import { isPlanned } from "./TripMonthHead";

/** Words that ask for the outings already fished that landed nothing. */
const NO_FISH = ["no fish", "blank", "bez ryb", "bez ryby", "pusty", "puste"];

/** A size in a typed part: "50 cm", "2kg", ">20 in", "ponad 400 mm". */
const SIZED = /\d\s?(?:lbs?|oz|kg|dag|g|in|cm|mm)(?=\s|$)/i;

/** Lower case with single spaces, so typed words compare however they were spaced. */
const plain = foldText;

/** Words that ask for the outings that counted a fish lost, or a strike missed. */
const LOST = ["lost", "lost fish", "spięte", "spięta", "spiętych"].map(plain);
const MISSED = ["missed", "missed strikes", "puste brania", "puste branie"].map(plain);
/** Words that ask for the outings still planned: ahead, or today's before its first fish, as the month headings count them. */
const PLANNED = ["planned", "plans", "zaplanowane", "zaplanowana", "zaplanowanych"].map(plain);
/** Words that ask for the outings on a Saturday or Sunday, or on the days between, as Bests splits them. */
const WEEKEND = ["weekend", "weekends", "weekendy", "weekendowe"].map(plain);
const WEEKDAY = ["weekday", "weekdays", "dni powszednie", "dzien powszedni", "w tygodniu"].map(plain);

/** Each outing's fish, gathered once per book: an outing is found by what it caught too. */
const fishCache = new WeakMap<Logbook, Map<string, CatchEntry[]>>();

function fishByTrip(book: Logbook): Map<string, CatchEntry[]> {
  let known = fishCache.get(book);
  if (known) return known;
  known = new Map();
  for (const entry of book.catches) if (entry.tripId) known.set(entry.tripId, [...(known.get(entry.tripId) ?? []), entry]);
  fishCache.set(book, known);
  return known;
}

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
  // "pike", "jig": the kinds and lures of its fish, as stored and as they read in the player's language.
  const caught = (fishByTrip(book).get(trip.id) ?? []).flatMap((entry) => [entry.species, t(entry.species), entry.lure, t(entry.lure)]);
  return plain([trip.title, trip.note, spot?.name ?? "", spot ? t(WATER_LABELS[spot.waterType]) : "", trip.date, ...written, ...caught].join(" \n "));
}

/**
 * The outings a search names, newest first. Parts joined with "+" must all hold; each part is a date word ("last
 * week", "Oct 12"), "no fish" for a past outing that landed nothing, "lost" or "missed" for one that counted a fish
 * lost or a strike missed, or words that all appear in the outing's title, note, water, written-out day, or its fish's
 * kinds and lures ("october", "cedar dawn", "pike jig").
 */
export function findTrips(
  book: Logbook,
  needle: string,
  fishOn: (tripId: string) => number,
  today: string,
  t: (text: string) => string,
  now = new Date(),
  fishTrips?: (part: string) => ReadonlySet<string>,
): Trip[] {
  // "pike 30in+" is a 30-plus pike, as the catch search reads it, not "pike 30in" and an empty part.
  const parts = readSizePlus(needle).split("+").map(plain).filter(Boolean);
  if (parts.length === 0) return [];
  // "szczupak ponad 50 cm", "> 2 kg": a part with a size is a catch search, and finds the outings its fish came on.
  const sized = new Map(fishTrips ? parts.filter(SIZED.test.bind(SIZED)).map((part) => [part, fishTrips(part)]) : []);
  // Each part's dates read once, not once per outing.
  // Outings can be ahead: "this weekend" on a Thursday is the coming one, and "tomorrow" is a day to find.
  // A day both ways: "dec 31" in October is the coming New Year's Eve for a plan and last year's for the outings had.
  const ranges = new Map(parts.map((part) => [part, [dateWords(part, now, { ahead: true }), dateWords(part, now)].filter((range) => range !== null)]));
  const matches = (trip: Trip, text: string, part: string) => {
    const bySize = sized.get(part);
    if (bySize) return bySize.has(trip.id);
    if (NO_FISH.includes(part)) return trip.date < today && fishOn(trip.id) === 0;
    if (LOST.includes(part)) return (trip.lost ?? 0) > 0;
    if (MISSED.includes(part)) return (trip.missed ?? 0) > 0;
    if (PLANNED.includes(part)) return isPlanned(trip, today, fishOn(trip.id));
    if (WEEKEND.includes(part) || WEEKDAY.includes(part)) {
      const weekend = [0, 6].includes(new Date(`${trip.date}T12:00:00`).getDay());
      return WEEKEND.includes(part) ? weekend : !weekend;
    }
    const days = ranges.get(part) ?? [];
    if (days.length > 0) return days.some((range) => trip.date >= range.from && trip.date <= range.to);
    // "w październiku" finds the outings of any October, as the catch search finds its fish.
    const month = monthWord(part);
    if (month >= 0 && Number(trip.date.slice(5, 7)) - 1 === month) return true;
    // "szczupaki" finds the outings that took a "szczupak": a plural stands for its shorter form.
    return part.split(" ").every((word) => text.includes(word) || singularStems(word).some((stem) => text.includes(stem)));
  };
  return book.trips
    .filter((trip) => {
      const text = tripText(book, trip, t);
      return parts.every((part) => matches(trip, text, part));
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}
