import { localDate, type Logbook } from "@stillwater/shared";

/** One day of a season: its fish, and whether an outing was planned for it. */
export type DayMark = { fish: number; outing: boolean };

/** The days of `year` that had a fish or an outing, by local "YYYY-MM-DD". */
export function dayMarks(book: Logbook, year: string): Map<string, DayMark> {
  const marks = new Map<string, DayMark>();
  const mark = (day: string) => {
    const row = marks.get(day) ?? { fish: 0, outing: false };
    marks.set(day, row);
    return row;
  };
  for (const trip of book.trips) if (trip.date.startsWith(`${year}-`)) mark(trip.date).outing = true;
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
