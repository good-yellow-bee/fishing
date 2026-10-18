import { shiftDate, type Logbook } from "@stillwater/shared";
import { PLAY_LAKE_ID } from "./playLake";
import { isSampleOuting } from "./bookCopy";

export type DatePick = { label: "Today" | "Tomorrow" | "Saturday" | "Sunday" | "Next Saturday"; date: string };

/** One-tap days for a new outing: today, tomorrow, and the coming Saturday when it is neither, else the one after. */
export function datePicks(now: Date): DatePick[] {
  const picks: DatePick[] = [
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
