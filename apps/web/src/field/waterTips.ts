import { biteTimes, catchesForSpot, lureTally, type BiteTime, type CatchEntry, type Logbook, type LureTally, type Trip } from "@stillwater/shared";

/** Below this many fish a water's "what works" line would be guesswork. */
export const TIPS_FROM = 3;

export type WaterTips = { lures: LureTally[]; time: BiteTime | null };

/** The lures that took the most fish on one water, and the time of day that gave the most. */
export function waterTips(catches: readonly CatchEntry[]): WaterTips | null {
  if (catches.length < TIPS_FROM) return null;
  const book = { spots: [], trips: [], catches: [...catches] };
  const lures = lureTally(book, 3);
  let time: BiteTime | null = null;
  for (const band of biteTimes(book)) if (band.count > 0 && (!time || band.count > time.count)) time = band;
  return { lures, time };
}

/** Lures worth packing for an outing still ahead: what has worked on its water. Nothing for a past outing. */
export function packingTips(book: Logbook, trip: Trip, today: string): string[] {
  if (trip.date < today) return [];
  return waterTips(catchesForSpot(book, trip.spotId))?.lures.map((row) => row.lure) ?? [];
}
