import type { Logbook } from "@stillwater/shared";
import { fishDay } from "../tripMonths";

/**
 * One day of a season: its fish, the outings planned for it, and `lateTrip`, the outing whose small-hours fish were
 * filed under this day when all of the day's fish came on it (else null). A fish caught after midnight counts for its
 * outing's day, not the day it was caught, as the days on the water do.
 */
export type DayMark = { fish: number; trips: string[]; lateTrip: string | null };

/** The days of `year` that had a fish or an outing, by local "YYYY-MM-DD". */
export function dayMarks(book: Logbook, year: string): Map<string, DayMark> {
  const marks = new Map<string, DayMark>();
  const mark = (day: string) => {
    const row = marks.get(day) ?? { fish: 0, trips: [] as string[], lateTrip: null };
    marks.set(day, row);
    return row;
  };
  for (const trip of book.trips) if (trip.date.startsWith(`${year}-`)) mark(trip.date).trips.push(trip.id);
  const tripDays = new Map(book.trips.map((trip) => [trip.id, trip.date]));
  const late = new Set<string>();
  const fishTrips = new Map<string, Set<string | null>>();
  for (const entry of book.catches) {
    const { day, late: small } = fishDay(entry, tripDays);
    if (!day.startsWith(`${year}-`)) continue;
    mark(day).fish += 1;
    if (small) late.add(day);
    fishTrips.set(day, (fishTrips.get(day) ?? new Set()).add(entry.tripId));
  }
  for (const day of late) {
    const only = [...fishTrips.get(day)!];
    if (only.length === 1 && only[0]) mark(day).lateTrip = only[0];
  }
  return marks;
}

/** The months ("YYYY-MM") with any marked day, in order. */
export function markedMonths(marks: ReadonlyMap<string, DayMark>): string[] {
  return [...new Set([...marks.keys()].map((day) => day.slice(0, 7)))].sort();
}
