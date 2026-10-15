import { biteTimes, lureTally, type BiteTime, type CatchEntry, type LureTally } from "@stillwater/shared";

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
