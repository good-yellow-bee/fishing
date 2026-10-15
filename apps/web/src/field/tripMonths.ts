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

/** "October 2026", in the reader's language. */
export function monthName(month: string): string {
  const name = new Intl.DateTimeFormat(locale(), { month: "long", year: "numeric" }).format(new Date(`${month}-15T12:00:00`));
  // Polish month names come lower case; a heading starts with a capital.
  return name.charAt(0).toLocaleUpperCase(locale()) + name.slice(1);
}

/** The calendar month ("2026-10") a fish was landed in, by the reader's clock. */
export function catchMonth(entry: CatchEntry): string {
  return localDate(new Date(entry.caughtAt)).slice(0, 7);
}
