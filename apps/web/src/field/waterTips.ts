import { biteTimes, catchesForSpot, lakeSeason, lureTally, type BiteTime, type LakeSeason, type CatchEntry, type Logbook, type LureTally, type Sky, type Trip } from "@stillwater/shared";

/** Below this many fish a water's "what works" line would be guesswork. */
export const TIPS_FROM = 3;

export type WaterTips = { lures: LureTally[]; time: BiteTime | null; sky: Sky | null; season: LakeSeason | null };

/** The lures that took the most fish on one water, and the time of day that gave the most. */
export function waterTips(catches: readonly CatchEntry[]): WaterTips | null {
  if (catches.length < TIPS_FROM) return null;
  const book = { spots: [], trips: [], catches: [...catches] };
  const lures = lureTally(book, 3);
  let time: BiteTime | null = null;
  for (const band of biteTimes(book)) if (band.count > 0 && (!time || band.count > time.count)) time = band;
  return { lures, time, sky: leadingSky(catches), season: leadingSeason(catches) };
}

/** The sky most of the fish came under, when at least two noted it and one sky clearly leads. */
function leadingSky(catches: readonly CatchEntry[]): Sky | null {
  const counts = new Map<Sky, number>();
  for (const entry of catches) if (entry.weather) counts.set(entry.weather.sky, (counts.get(entry.weather.sky) ?? 0) + 1);
  const [top, next] = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (!top || top[1] < 2 || (next && next[1] === top[1])) return null;
  return top[0];
}

/** The season most of the fish came in, once they span more than one season and one clearly leads. */
function leadingSeason(catches: readonly CatchEntry[]): LakeSeason | null {
  const counts = new Map<LakeSeason, number>();
  for (const entry of catches) {
    const at = new Date(entry.caughtAt);
    if (Number.isNaN(at.getTime())) continue;
    const season = lakeSeason(at);
    counts.set(season, (counts.get(season) ?? 0) + 1);
  }
  const [top, next] = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (!top || !next || top[1] < 2 || next[1] === top[1]) return null;
  return top[0];
}

/** Lures worth packing for an outing still ahead: what has worked on its water. Nothing for a past outing. */
export function packingTips(book: Logbook, trip: Trip, today: string): string[] {
  if (trip.date < today) return [];
  return waterTips(catchesForSpot(book, trip.spotId))?.lures.map((row) => row.lure) ?? [];
}
