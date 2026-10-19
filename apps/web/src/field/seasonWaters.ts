import type { Logbook } from "@stillwater/shared";
import { countedBook } from "./milestones";
import { PLAY_LAKE_ID } from "./playLake";
import { bookFishDay } from "./tripMonths";

/**
 * This season's waters: those with a fish of the angler's own or an outing fished this year, and how many of them
 * were first fished this year. An outing counts once past, or today's once it has a fish, as the water's page counts it.
 */
export function seasonWaters(book: Logbook, today: string): { fished: number; first: number } {
  const counted = countedBook(book);
  const year = today.slice(0, 4);
  const fished = new Set(counted.catches.flatMap((entry) => (entry.tripId ? [entry.tripId] : [])));
  // Each water's first day in the book and whether it was fished this year.
  const firstDay = new Map<string, string>();
  const thisYear = new Set<string>();
  const note = (spotId: string, day: string) => {
    if (spotId === PLAY_LAKE_ID || day > today) return;
    if (!firstDay.has(spotId) || day < firstDay.get(spotId)!) firstDay.set(spotId, day);
    if (day.startsWith(`${year}-`)) thisYear.add(spotId);
  };
  for (const trip of counted.trips) if (trip.date < today || fished.has(trip.id)) note(trip.spotId, trip.date);
  // A night's small hours on their outing's day, as the calendar dates them.
  for (const entry of counted.catches) note(entry.spotId, bookFishDay(counted, entry));
  return { fished: thisYear.size, first: [...thisYear].filter((id) => firstDay.get(id)!.startsWith(`${year}-`)).length };
}
