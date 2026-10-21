import type { Logbook } from "@stillwater/shared";
import { countedBook } from "./milestones";
import { PLAY_LAKE_ID } from "./playLake";
import { bookFishDay } from "./tripMonths";
import { outingCounted, outingDay } from "./tripDates";
import { waterKeys } from "./spotOrder";

/**
 * This season's waters: those with a fish of the angler's own or an outing fished this year, and how many of them
 * were first fished this year. An outing counts once past, or today's once it has a fish, a fish lost or a strike missed,
 * as the water's page counts it. Twin waters ("Śniardwy", "Sniardwy") are one, as a search reads them.
 */
export function seasonWaters(book: Logbook, today: string): { fished: number; first: number } {
  const counted = countedBook(book);
  const year = today.slice(0, 4);
  // Last evening's outing, still going in the small hours, is no finished blank yet, as the water's page takes it.
  const fishedBy = outingDay(today);
  const fished = new Set(counted.catches.flatMap((entry) => (entry.tripId ? [entry.tripId] : [])));
  // Each water's first day in the book and whether it was fished this year.
  const firstDay = new Map<string, string>();
  const thisYear = new Set<string>();
  const waterOf = waterKeys(book);
  const note = (spotId: string, day: string) => {
    if (spotId === PLAY_LAKE_ID || day > today) return;
    const water = waterOf.get(spotId) || spotId;
    if (!firstDay.has(water) || day < firstDay.get(water)!) firstDay.set(water, day);
    if (day.startsWith(`${year}-`)) thisYear.add(water);
  };
  for (const trip of counted.trips) if (outingCounted(counted, trip, fishedBy, fished.has(trip.id) ? 1 : 0)) note(trip.spotId, trip.date);
  // A night's small hours on their outing's day, as the calendar dates them.
  for (const entry of counted.catches) note(entry.spotId, bookFishDay(counted, entry));
  return { fished: thisYear.size, first: [...thisYear].filter((id) => firstDay.get(id)!.startsWith(`${year}-`)).length };
}
