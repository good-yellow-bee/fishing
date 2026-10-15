import { localDate, type CatchEntry, type Trip } from "@stillwater/shared";
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
