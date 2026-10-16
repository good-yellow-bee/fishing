import { localDate, type CatchEntry, type Logbook, type Trip } from "@stillwater/shared";
import { locale } from "../i18n";

export type TripMonth = { month: string; trips: Trip[] };

/** Trips already in date order, cut into runs by calendar month ("2026-10"), keeping that order. */
export function tripsByMonth(trips: readonly Trip[]): TripMonth[] {
  const months: TripMonth[] = [];
  for (const trip of trips) {
    const month = trip.date.slice(0, 7);
    const last = months[months.length - 1];
    if (last && last.month === month) last.trips.push(trip);
    else months.push({ month, trips: [trip] });
  }
  return months;
}

// Building a date formatter is slow next to using one, and a search may name thousands of fish's months.
const monthNames = new Map<string, string>();

/** "October 2026", in the reader's language. */
export function monthName(month: string): string {
  const key = `${locale()} ${month}`;
  const known = monthNames.get(key);
  if (known) return known;
  const name = new Intl.DateTimeFormat(locale(), { month: "long", year: "numeric" }).format(new Date(`${month}-15T12:00:00`));
  // Polish month names come lower case; a heading starts with a capital.
  const heading = name.charAt(0).toLocaleUpperCase(locale()) + name.slice(1);
  monthNames.set(key, heading);
  return heading;
}

/** The calendar month ("2026-10") a fish was landed in, by the reader's clock. */
export function catchMonth(entry: CatchEntry): string {
  return localDate(new Date(entry.caughtAt)).slice(0, 7);
}

/** Fish per calendar month, newest month first, for the latest `limit` months that have any. */
export function monthTally(catches: readonly CatchEntry[], limit = 12): { month: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const entry of catches) {
    if (Number.isNaN(new Date(entry.caughtAt).getTime())) continue;
    const month = catchMonth(entry);
    counts.set(month, (counts.get(month) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, limit)
    .map(([month, count]) => ({ month, count }));
}

/** Fish per calendar year they came in, newest year first. */
export function yearTally(catches: readonly CatchEntry[]): { year: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const entry of catches) {
    if (Number.isNaN(new Date(entry.caughtAt).getTime())) continue;
    const year = catchMonth(entry).slice(0, 4);
    counts.set(year, (counts.get(year) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([year, count]) => ({ year, count }));
}

/** The days of `year` the book shows on the water: a fish logged, or an outing from before today. */
export function daysOut(book: Logbook, year: string, today: string): number {
  const days = new Set<string>();
  for (const entry of book.catches) {
    const day = localDate(new Date(entry.caughtAt));
    if (day.startsWith(`${year}-`)) days.add(day);
  }
  // An outing planned for today counts once it has a fish, through the catches above.
  for (const trip of book.trips) if (trip.date.startsWith(`${year}-`) && trip.date < today) days.add(trip.date);
  return days.size;
}
