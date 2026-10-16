import { WATER_LABELS, foldText, spotById, type Logbook, type Trip } from "@stillwater/shared";
import { dateWords } from "./dateWords";

/** Words that ask for the outings already fished that landed nothing. */
const NO_FISH = ["no fish", "blank", "bez ryb", "bez ryby", "pusty", "puste"];

/** Lower case with single spaces, so typed words compare however they were spaced. */
const plain = foldText;

/** Everything an outing can be found by: its title, note, water and kind of water, and its day written out. */
function tripText(book: Logbook, trip: Trip, t: (text: string) => string): string {
  const spot = spotById(book, trip.spotId);
  const [y, m, d] = trip.date.split("-").map(Number) as [number, number, number];
  const day = new Date(y, m - 1, d, 12);
  // The month on its own too: Polish writes it differently beside a day ("września") than alone ("wrzesień").
  const written = ["en", "pl"].flatMap((lang) => [
    new Intl.DateTimeFormat(lang, { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(day),
    new Intl.DateTimeFormat(lang, { month: "long" }).format(day),
  ]);
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
  const matches = (trip: Trip, text: string, part: string) => {
    if (NO_FISH.includes(part)) return trip.date < today && fishOn(trip.id) === 0;
    const range = dateWords(part, now);
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
