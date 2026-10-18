import { WATER_LABELS, foldText, spotById, type CatchEntry, type Logbook, type Trip } from "@stillwater/shared";
import { dateWords, monthWord } from "./dateWords";
import { singularStems } from "./pluralWord";
import { readSizePlus } from "./sizePlus";
import { isPlanned } from "./TripMonthHead";
import { isSampleOnly, isSampleOuting } from "./bookCopy";
import { PLAY_LAKE_ID, offPlayLake } from "./playLake";

/** Words that ask for the outings already fished that landed nothing. */
const NO_FISH = ["no fish", "blank", "bez ryb", "bez ryby", "pusty", "puste"];

/** A size in a typed part: "50 cm", "2kg", ">20 in", "ponad 400 mm". */
const SIZED = /\d\s?(?:lbs?|oz|kg|dag|g|in|cm|mm)(?=\s|$)/i;

/** Lower case with single spaces, so typed words compare however they were spaced. */
const plain = foldText;

/** Words that name the sample week's outings and the game's rounds, as "-sample" and "-game" leave them out. */
const SAMPLE = ["sample", "przykładowe"].map(plain);
const GAME = ["game", "gra"].map(plain);

/** A part's "-word"s, which leave out the outings they name, apart from the rest of it. */
function splitOut(part: string): { rest: string; out: string[] } {
  const words = part.split(" ");
  const isOut = (word: string) => word.length > 1 && word.startsWith("-");
  return { rest: words.filter((word) => !isOut(word)).join(" "), out: words.filter(isOut).map((word) => word.slice(1)) };
}

/**
 * A day's outings for the trip search, leaving out those not in `kept` (the game's round, the sample week's outings
 * beside the angler's own), as a count of `kept` says: "2026-10-12 -game -sample".
 */
export function tripDaySearch(book: Logbook, day: string, kept: ReadonlySet<string>, t: (text: string) => string): string {
  const left = book.trips.filter((trip) => trip.date === day && !kept.has(trip.id));
  return [
    day,
    ...(left.some((trip) => trip.spotId === PLAY_LAKE_ID) ? [`-${t("game|search word")}`] : []),
    ...(left.some(isSampleOuting) ? [`-${t("sample|search word")}`] : []),
  ].join(" ");
}

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
  const typed = readSizePlus(needle).split("+").map(plain).filter(Boolean);
  if (typed.length === 0) return [];
  // "-sample", "-game", "-cedar": what a part leaves out, apart from what it asks for.
  const split = typed.map(splitOut);
  const parts = split.map((part) => part.rest).filter(Boolean);
  const out = split.flatMap((part) => part.out);
  const left = (trip: Trip, text: string) =>
    out.some((word) => (SAMPLE.includes(word) ? isSampleOuting(trip) : GAME.includes(word) ? !offPlayLake(trip) : text.includes(word)));
  // "szczupak ponad 50 cm", "> 2 kg": a part with a size is a catch search, and finds the outings its fish came on.
  const sized = new Map(fishTrips ? parts.filter(SIZED.test.bind(SIZED)).map((part) => [part, fishTrips(part)]) : []);
  // Each part's dates read once, not once per outing.
  // Outings can be ahead: "this weekend" on a Thursday is the coming one, and "tomorrow" is a day to find.
  // A day both ways: "dec 31" in October is the coming New Year's Eve for a plan and last year's for the outings had.
  const ranges = new Map(parts.map((part) => [part, [dateWords(part, now, { ahead: true }), dateWords(part, now)].filter((range) => range !== null)]));
  const matches = (trip: Trip, text: string, part: string) => {
    const bySize = sized.get(part);
    if (bySize) return bySize.has(trip.id);
    // "game" and "sample" on their own ask for those outings, as "-game" and "-sample" leave them out.
    if (GAME.includes(part)) return !offPlayLake(trip);
    if (SAMPLE.includes(part)) return isSampleOuting(trip);
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
  // The sample week's plans still ahead stay hidden once the book has the angler's own, as Coming up hides them.
  const hideSamplePlans = !isSampleOnly(book);
  return book.trips
    .filter((trip) => {
      if (hideSamplePlans && isSampleOuting(trip) && trip.date >= today) return false;
      const text = tripText(book, trip, t);
      return !left(trip, text) && parts.every((part) => matches(trip, text, part));
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}
