import { shiftDate, type Logbook } from "@stillwater/shared";
import { PLAY_LAKE_ID } from "./playLake";
import { isSampleTrip } from "./bookCopy";

export type DatePick = { label: "Today" | "Tomorrow" | "Saturday" | "Next Saturday"; date: string };

/** One-tap days for a new outing: today, tomorrow, and the coming Saturday when it is neither, else the one after. */
export function datePicks(now: Date): DatePick[] {
  const picks: DatePick[] = [
    { label: "Today", date: shiftDate(now, 0) },
    { label: "Tomorrow", date: shiftDate(now, 1) },
  ];
  const ahead = (6 - now.getDay() + 7) % 7;
  if (ahead >= 2) picks.push({ label: "Saturday", date: shiftDate(now, ahead) });
  // On a Friday or a Saturday, "next weekend" is a week on.
  else picks.push({ label: "Next Saturday", date: shiftDate(now, ahead + 7) });
  return picks;
}

/** Names given to earlier outings, this water's first, newest first, each once. */
export function pastTitles(book: Logbook, spotId: string, limit = 8): string[] {
  const named = book.trips
    .filter((trip) => trip.spotId !== PLAY_LAKE_ID && !isSampleTrip(trip.id) && trip.title.trim())
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
