import { LATE_NIGHT_UNTIL } from "./suggestions";
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

/**
 * Fish per calendar month, newest month first, from the latest month with a fish back over `limit` months (13, so
 * that month sits beside the same month a year before it) or to the first fish. A month between with none is there at 0,
 * not left out.
 */
export function monthTally(catches: readonly CatchEntry[], limit = 13): { month: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const entry of catches) {
    if (Number.isNaN(new Date(entry.caughtAt).getTime())) continue;
    const month = catchMonth(entry);
    counts.set(month, (counts.get(month) ?? 0) + 1);
  }
  const months = [...counts.keys()].sort();
  if (months.length === 0) return [];
  const [y, m] = months[months.length - 1]!.split("-").map(Number) as [number, number];
  const rows: { month: string; count: number }[] = [];
  for (let back = 0; back < limit; back++) {
    const at = new Date(y, m - 1 - back, 1);
    const month = `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}`;
    if (month < months[0]!) break;
    rows.push({ month, count: counts.get(month) ?? 0 });
  }
  return rows;
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

/**
 * The day a fish counts for: its own local day, or its outing's day when it came in the small hours after that day
 * (`late`), so a night session doesn't make a second day out. `tripDays` maps outing ids to their "YYYY-MM-DD".
 */
export function fishDay(entry: Pick<CatchEntry, "caughtAt" | "tripId">, tripDays: ReadonlyMap<string, string>): { day: string; late: boolean } {
  const at = new Date(entry.caughtAt);
  const outing = entry.tripId ? tripDays.get(entry.tripId) : undefined;
  const evening = new Date(at.getFullYear(), at.getMonth(), at.getDate() - 1, 12);
  if (outing && at.getHours() < LATE_NIGHT_UNTIL && localDate(evening) === outing) return { day: outing, late: true };
  return { day: localDate(at), late: false };
}

/** The days of `year` the book shows on the water: a fish logged, or an outing from before today. */
export function daysOut(book: Logbook, year: string, today: string): number {
  const days = new Set<string>();
  const tripDays = new Map(book.trips.map((trip) => [trip.id, trip.date]));
  for (const entry of book.catches) {
    const day = fishDay(entry, tripDays).day;
    if (day.startsWith(`${year}-`)) days.add(day);
  }
  // An outing planned for today counts once it has a fish, through the catches above.
  for (const trip of book.trips) if (trip.date.startsWith(`${year}-`) && trip.date < today) days.add(trip.date);
  return days.size;
}
