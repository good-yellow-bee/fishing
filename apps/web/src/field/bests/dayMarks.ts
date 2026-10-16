import { localDate, type Logbook } from "@stillwater/shared";

/** One day of a season: its fish, and the outings planned for it. */
export type DayMark = { fish: number; trips: string[] };

/** The days of `year` that had a fish or an outing, by local "YYYY-MM-DD". */
export function dayMarks(book: Logbook, year: string): Map<string, DayMark> {
  const marks = new Map<string, DayMark>();
  const mark = (day: string) => {
    const row = marks.get(day) ?? { fish: 0, trips: [] as string[] };
    marks.set(day, row);
    return row;
  };
  for (const trip of book.trips) if (trip.date.startsWith(`${year}-`)) mark(trip.date).trips.push(trip.id);
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
