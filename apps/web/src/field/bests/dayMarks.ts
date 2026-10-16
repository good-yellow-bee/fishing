import { fishCountsByTrip, localDate, type Logbook } from "@stillwater/shared";

/**
 * One day of a season: its fish, the outings planned for it, and whether any of those outings landed a fish (one
 * caught after midnight counts for its outing's day, not the day it was caught).
 */
export type DayMark = { fish: number; trips: string[]; landed: boolean };

/** The days of `year` that had a fish or an outing, by local "YYYY-MM-DD". */
export function dayMarks(book: Logbook, year: string): Map<string, DayMark> {
  const marks = new Map<string, DayMark>();
  const mark = (day: string) => {
    const row = marks.get(day) ?? { fish: 0, trips: [] as string[], landed: false };
    marks.set(day, row);
    return row;
  };
  const fishByTrip = fishCountsByTrip(book);
  for (const trip of book.trips) {
    if (!trip.date.startsWith(`${year}-`)) continue;
    const row = mark(trip.date);
    row.trips.push(trip.id);
    if ((fishByTrip.get(trip.id) ?? 0) > 0) row.landed = true;
  }
  for (const entry of book.catches) {
    const day = localDate(new Date(entry.caughtAt));
    if (day.startsWith(`${year}-`)) mark(day).fish += 1;
  }
  return marks;
}

/** The months ("YYYY-MM") with any marked day, in order. */
export function markedMonths(marks: ReadonlyMap<string, DayMark>): string[] {
  return [...new Set([...marks.keys()].map((day) => day.slice(0, 7)))].sort();
}
