import { catchesForTrip, localDate, shiftDate, type Logbook, type Trip } from "@stillwater/shared";
import { PLAY_LAKE_ID } from "./playLake";
import { LATE_NIGHT_UNTIL } from "./suggestions";
import { isSampleOuting } from "./bookCopy";
import { newestOutingFirst } from "./catchNeighbors";

export type DatePick = { label: "Last night" | "Today" | "Tomorrow" | "Saturday" | "Sunday" | "Next Saturday"; date: string };

/**
 * One-tap days for a new outing: today, tomorrow, and the coming Saturday when it is neither, else the one after. In
 * the small hours, last night first: a night session is dated by its evening.
 */
export function datePicks(now: Date): DatePick[] {
  const picks: DatePick[] = [
    ...(now.getHours() < LATE_NIGHT_UNTIL ? [{ label: "Last night" as const, date: shiftDate(now, -1) }] : []),
    { label: "Today", date: shiftDate(now, 0) },
    { label: "Tomorrow", date: shiftDate(now, 1) },
  ];
  const ahead = (6 - now.getDay() + 7) % 7;
  // The weekend's other day, once it is past tomorrow: after Saturday, or on a Friday before next week's.
  const sunday = (7 - now.getDay()) % 7;
  const sundayPick: DatePick[] = sunday >= 2 ? [{ label: "Sunday", date: shiftDate(now, sunday) }] : [];
  if (ahead >= 2) picks.push({ label: "Saturday", date: shiftDate(now, ahead) }, ...sundayPick);
  // On a Friday or a Saturday, "next weekend" is a week on.
  else picks.push(...sundayPick, { label: "Next Saturday", date: shiftDate(now, ahead + 7) });
  return picks;
}

/**
 * The day whose outing is still going: yesterday's in the small hours, as a night session is dated by its evening, so
 * an evening outing isn't a blank day at midnight. `today` is the calendar's day; any other day is taken as it is.
 */
export function outingDay(today: string, now = new Date()): string {
  return today === localDate(now) && now.getHours() < LATE_NIGHT_UNTIL ? shiftDate(now, -1) : today;
}

/**
 * Whether last evening's outing is still out on the water in the small hours: dated yesterday, before 04:00, with no
 * fish yet or one in the last twelve hours. A morning outing yesterday ended long ago, so it reads "Yesterday".
 */
export function stillGoing(book: Logbook, trip: Trip, now = new Date()): boolean {
  if (now.getHours() >= LATE_NIGHT_UNTIL || trip.date !== shiftDate(now, -1)) return false;
  const fish = catchesForTrip(book, trip.id);
  return fish.length === 0 || fish.some((entry) => recentFish(entry.caughtAt, now));
}

/** A fish in the last twelve hours; never one logged ahead of the clock. */
function recentFish(caughtAt: string, now: Date): boolean {
  const since = now.getTime() - Date.parse(caughtAt);
  return since >= 0 && since < 12 * 3_600_000;
}

/**
 * Whether the angler is out on this outing now: today's once it has a fish in the last twelve hours, or in the small
 * hours last evening's still going. The Map and the water's page say "Out now" by it.
 */
export function outNow(book: Logbook, trip: Trip, now = new Date()): boolean {
  if (stillGoing(book, trip, now)) return true;
  return trip.date === localDate(now) && catchesForTrip(book, trip.id).some((entry) => recentFish(entry.caughtAt, now));
}

/** The angler's outing out now at this water, of a dawn and a dusk the later; none on the game's lake or a sample plan. */
export function outNowAt(book: Logbook, spotId: string, now = new Date()): Trip | undefined {
  if (spotId === PLAY_LAKE_ID) return undefined;
  return book.trips.filter((trip) => trip.spotId === spotId && !isSampleOuting(trip) && outNow(book, trip, now)).sort(newestOutingFirst(book))[0];
}

/** Whether an outing's title is only the name of a water: what an untitled outing is saved under. */
function waterNamed(title: string, spots: Logbook["spots"]): boolean {
  const name = title.trim().toLocaleLowerCase();
  return spots.some((spot) => spot.name.trim().toLocaleLowerCase() === name);
}

/** The title the player gave an outing, for its form: "" for one saved under its water's name, so a new water renames it. */
export function ownTitle(trip: { title: string; spotId: string }, spots: Logbook["spots"]): string {
  return waterNamed(trip.title, spots.filter((spot) => spot.id === trip.spotId)) ? "" : trip.title;
}

/** Names given to earlier outings, this water's first, newest first, each once; a water's name is no title of its own. */
export function pastTitles(book: Logbook, spotId: string, limit = 8): string[] {
  const named = book.trips
    .filter((trip) => trip.spotId !== PLAY_LAKE_ID && !isSampleOuting(trip) && trip.title.trim() && !waterNamed(trip.title, book.spots))
    .sort((a, b) => Number(b.spotId === spotId) - Number(a.spotId === spotId) || b.date.localeCompare(a.date));
  const seen = new Set<string>();
  const titles: string[] = [];
  for (const trip of named) {
    const title = trip.title.trim();
    const key = title.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    titles.push(title);
    if (titles.length === limit) break;
  }
  return titles;
}
